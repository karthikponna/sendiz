package worker

import (
	"context"
	"errors"
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/karthikponna/sendiz/backend/internal/logger"
	"github.com/karthikponna/sendiz/backend/internal/mailer"
	"github.com/karthikponna/sendiz/backend/internal/model"
	"github.com/karthikponna/sendiz/backend/internal/queue"
)

const (
	reclaimEvery = 5 * time.Second
	readBlock    = 2 * time.Second
)

type Config struct {
	Concurrency int
	MaxAttempts int
	// RetryAfter is how long an unacknowledged message waits before it is redelivered.
	// It must be longer than the SMTP timeout, otherwise a slow send gets picked up twice.
	RetryAfter time.Duration
}

type Worker struct {
	db       *gorm.DB
	rdb      *redis.Client
	mailer   *mailer.Mailer
	cfg      Config
	consumer string
	log      zerolog.Logger
}

func New(db *gorm.DB, rdb *redis.Client, m *mailer.Mailer, cfg Config) *Worker {
	host, _ := os.Hostname()
	consumer := fmt.Sprintf("%s-%d", host, os.Getpid())
	return &Worker{
		db:       db,
		rdb:      rdb,
		mailer:   m,
		cfg:      cfg,
		consumer: consumer,
		log:      logger.Log.With().Str("consumer", consumer).Logger(),
	}
}

// Run blocks until ctx is cancelled, then waits for in-flight emails to finish.
func (w *Worker) Run(ctx context.Context) error {
	if err := queue.EnsureGroup(ctx, w.rdb); err != nil {
		return err
	}

	jobs := make(chan redis.XMessage)
	var wg sync.WaitGroup
	for range w.cfg.Concurrency {
		wg.Go(func() {
			for msg := range jobs {
				w.handle(msg)
			}
		})
	}
	w.log.Info().Int("concurrency", w.cfg.Concurrency).Msg("worker started")

	w.fetch(ctx, jobs)
	close(jobs)

	w.log.Info().Msg("shutting down, waiting for in-flight emails")
	wg.Wait()
	w.log.Info().Msg("worker stopped")
	return nil
}

// fetch reads new stream entries plus entries left unacknowledged for longer than
// RetryAfter (crashed workers or temporary SMTP failures) and hands them to the pool.
func (w *Worker) fetch(ctx context.Context, jobs chan<- redis.XMessage) {
	reclaimCursor := "0-0"
	var lastReclaim time.Time

	dispatch := func(msgs []redis.XMessage) bool {
		for _, msg := range msgs {
			select {
			case jobs <- msg:
			case <-ctx.Done():
				return false
			}
		}
		return true
	}

	for ctx.Err() == nil {
		if time.Since(lastReclaim) >= reclaimEvery {
			lastReclaim = time.Now()
			msgs, next, err := w.rdb.XAutoClaim(ctx, &redis.XAutoClaimArgs{
				Stream:   queue.EmailStream,
				Group:    queue.EmailGroup,
				Consumer: w.consumer,
				MinIdle:  w.cfg.RetryAfter,
				Start:    reclaimCursor,
				Count:    int64(w.cfg.Concurrency),
			}).Result()
			if err != nil && ctx.Err() == nil {
				w.log.Error().Err(err).Msg("failed to reclaim pending emails")
			} else {
				reclaimCursor = next
				if len(msgs) > 0 {
					w.log.Info().Int("count", len(msgs)).Msg("reclaimed pending emails")
				}
				if !dispatch(msgs) {
					return
				}
			}
		}

		streams, err := w.rdb.XReadGroup(ctx, &redis.XReadGroupArgs{
			Group:    queue.EmailGroup,
			Consumer: w.consumer,
			Streams:  []string{queue.EmailStream, ">"},
			Count:    int64(w.cfg.Concurrency),
			Block:    readBlock,
		}).Result()
		if errors.Is(err, redis.Nil) || ctx.Err() != nil {
			continue
		}
		if err != nil {
			w.log.Error().Err(err).Msg("failed to read from stream, retrying")
			time.Sleep(time.Second)
			continue
		}
		for _, s := range streams {
			if !dispatch(s.Messages) {
				return
			}
		}
	}
}

// handle runs to completion even during shutdown so an email is never left half-sent.
func (w *Worker) handle(msg redis.XMessage) {
	ctx := context.Background()
	raw, _ := msg.Values[queue.EmailIDKey].(string)
	log := w.log.With().Str("msg_id", msg.ID).Str("email_id", raw).Logger()

	id, err := uuid.Parse(raw)
	if err != nil {
		log.Error().Err(err).Msg("dropping message with invalid email id")
		w.ack(log, msg.ID)
		return
	}

	email, claimed, err := w.claim(ctx, id)
	if err != nil {
		log.Error().Err(err).Msg("failed to claim email, will retry")
		return
	}
	if !claimed {
		w.handleUnclaimed(ctx, log, msg.ID, id)
		return
	}

	// A worker crashed during the final attempt; don't send again.
	if email.Attempts > w.cfg.MaxAttempts {
		w.finish(ctx, log, msg.ID, id, model.StatusFailed, "max attempts reached")
		return
	}

	sendErr := w.mailer.Send(ctx, mailer.Message{
		ID:      email.ID.String(),
		From:    email.From,
		To:      email.To,
		Subject: email.Subject,
		HTML:    email.HTML,
		Text:    email.Text,
	})

	switch {
	case sendErr == nil:
		w.finish(ctx, log, msg.ID, id, model.StatusSent, "")
		log.Info().Str("to", email.To).Int("attempt", email.Attempts).Msg("email sent")
	case mailer.IsPermanent(sendErr) || email.Attempts >= w.cfg.MaxAttempts:
		w.finish(ctx, log, msg.ID, id, model.StatusFailed, sendErr.Error())
		log.Error().Err(sendErr).Int("attempt", email.Attempts).Msg("email failed")
	default:
		// Leave the stream entry unacknowledged; it is redelivered after RetryAfter.
		err := w.db.WithContext(ctx).Model(&model.Email{}).Where("id = ?", id).Updates(map[string]any{
			"status":     model.StatusQueued,
			"last_error": sendErr.Error(),
			"updated_at": gorm.Expr("now()"),
		}).Error
		if err != nil {
			log.Error().Err(err).Msg("failed to mark email for retry")
		}
		log.Warn().Err(sendErr).Int("attempt", email.Attempts).Dur("retry_after", w.cfg.RetryAfter).Msg("temporary failure, will retry")
	}
}

// claim moves the email to "sending" and bumps its attempt count. It only succeeds if the
// email is queued, or stuck in "sending" longer than RetryAfter (its worker died), which
// stops two workers from sending the same email at the same time.
func (w *Worker) claim(ctx context.Context, id uuid.UUID) (model.Email, bool, error) {
	var email model.Email
	res := w.db.WithContext(ctx).Model(&email).Clauses(clause.Returning{}).
		Where("id = ?", id).
		Where("status = ? OR (status = ? AND updated_at < now() - make_interval(secs => ?))",
			model.StatusQueued, model.StatusSending, w.cfg.RetryAfter.Seconds()).
		Updates(map[string]any{
			"status":     model.StatusSending,
			"attempts":   gorm.Expr("attempts + 1"),
			"updated_at": gorm.Expr("now()"),
		})
	if res.Error != nil {
		return email, false, res.Error
	}
	return email, res.RowsAffected == 1, nil
}

// handleUnclaimed acks messages whose email is already finished or missing. If another
// worker is still sending it, the message is left pending and looked at again later.
func (w *Worker) handleUnclaimed(ctx context.Context, log zerolog.Logger, msgID string, id uuid.UUID) {
	var email model.Email
	err := w.db.WithContext(ctx).Select("status").Where("id = ?", id).Take(&email).Error
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		log.Warn().Msg("email not found, dropping message")
		w.ack(log, msgID)
	case err != nil:
		log.Error().Err(err).Msg("failed to load email status")
	case email.Status == model.StatusSent || email.Status == model.StatusFailed:
		w.ack(log, msgID)
	default:
		log.Debug().Str("status", string(email.Status)).Msg("email is being handled elsewhere")
	}
}

func (w *Worker) finish(ctx context.Context, log zerolog.Logger, msgID string, id uuid.UUID, status model.EmailStatus, lastError string) {
	updates := map[string]any{
		"status":     status,
		"last_error": lastError,
		"updated_at": gorm.Expr("now()"),
	}
	if status == model.StatusSent {
		updates["sent_at"] = gorm.Expr("now()")
	}
	if err := w.db.WithContext(ctx).Model(&model.Email{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		// Not acking means the message is redelivered, so the email could be sent twice.
		// That's the at-least-once trade-off; losing the status would be worse.
		log.Error().Err(err).Str("status", string(status)).Msg("failed to save email status")
		return
	}
	w.ack(log, msgID)
}

func (w *Worker) ack(log zerolog.Logger, msgID string) {
	if err := queue.Ack(context.Background(), w.rdb, msgID); err != nil {
		log.Error().Err(err).Msg("failed to ack message")
	}
}
