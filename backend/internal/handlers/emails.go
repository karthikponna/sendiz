package handlers

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/labstack/echo/v5"
	"gorm.io/gorm"

	"github.com/karthikponna/sendiz/backend/internal/middleware"
	"github.com/karthikponna/sendiz/backend/internal/model"
	"github.com/karthikponna/sendiz/backend/internal/queue"
)

const maxEmailsPerRequest = 100

type EmailInput struct {
	From    string `json:"from"`
	To      string `json:"to"`
	Subject string `json:"subject"`
	HTML    string `json:"html"`
	Text    string `json:"text"`
}

type sendEmailsRequest struct {
	Emails []EmailInput `json:"emails"`
}

type emailID struct {
	ID uuid.UUID `json:"id"`
}

// SendEmails handles POST /email for API key callers (the SDK).
func (h *Handler) SendEmails(c *echo.Context) error {
	var req sendEmailsRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid JSON body")
	}
	if len(req.Emails) == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "'emails' must contain at least one email")
	}
	if len(req.Emails) > maxEmailsPerRequest {
		return echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf("At most %d emails per request", maxEmailsPerRequest))
	}

	ids, err := h.queueEmails(c.Request().Context(), middleware.UserID(c), req.Emails)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusAccepted, map[string]any{"data": ids})
}

// GetEmail handles GET /email/:id; callers only see their own emails.
func (h *Handler) GetEmail(c *echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid email id")
	}

	var email model.Email
	err = h.DB.WithContext(c.Request().Context()).
		Where("id = ? AND user_id = ?", id, middleware.UserID(c)).
		Take(&email).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return echo.NewHTTPError(http.StatusNotFound, "Email not found")
	}
	if err != nil {
		log.Error().Err(err).Str("id", id.String()).Msg("failed to load email")
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to load email")
	}
	return c.JSON(http.StatusOK, email)
}

// queueEmails saves the emails first (Postgres is the source of truth), then pushes only
// their IDs to Redis. Workers do the actual sending.
func (h *Handler) queueEmails(ctx context.Context, userID uuid.UUID, inputs []EmailInput) ([]emailID, error) {
	if h.OnlySendToSelf {
		s, err := h.loadSender(ctx, userID)
		if err != nil {
			log.Error().Err(err).Str("user_id", userID.String()).Msg("failed to load sender")
			return nil, echo.NewHTTPError(http.StatusInternalServerError, "Failed to load your account")
		}
		if err := h.checkRecipients(s, inputs); err != nil {
			return nil, err
		}
		for i := range inputs {
			inputs[i].From = h.EmailFrom
		}
	}

	emails := make([]model.Email, len(inputs))
	ids := make([]uuid.UUID, len(inputs))
	for i, in := range inputs {
		// UUIDv7 is time-ordered, which keeps primary key inserts append-only in the index
		// and lets the dashboard paginate by id.
		id, err := uuid.NewV7()
		if err != nil {
			return nil, echo.NewHTTPError(http.StatusInternalServerError, "Failed to generate email id")
		}
		ids[i] = id
		emails[i] = model.Email{
			Base:    model.Base{ID: id},
			UserID:  userID,
			From:    in.From,
			To:      in.To,
			Subject: in.Subject,
			HTML:    in.HTML,
			Text:    in.Text,
			Status:  model.StatusQueued,
		}
	}

	// Counting and saving in one transaction means a failed insert never uses up quota.
	err := h.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if h.DailyLimit > 0 {
			if err := reserveQuota(tx, userID, len(emails), h.DailyLimit); err != nil {
				return err
			}
		}
		return tx.Create(&emails).Error
	})
	if errors.Is(err, errQuotaExceeded) {
		return nil, h.quotaExceededError()
	}
	if err != nil {
		log.Error().Err(err).Int("count", len(emails)).Msg("failed to save emails")
		return nil, echo.NewHTTPError(http.StatusInternalServerError, "Failed to save emails")
	}

	if err := queue.Enqueue(ctx, h.RDB, ids); err != nil {
		log.Error().Err(err).Int("count", len(ids)).Msg("failed to enqueue emails")
		// Mark them failed so they don't sit in "queued" forever with nothing in the queue.
		markErr := h.DB.WithContext(context.WithoutCancel(ctx)).Model(&model.Email{}).
			Where("id IN ?", ids).
			Updates(map[string]any{"status": model.StatusFailed, "last_error": "failed to enqueue"}).Error
		if markErr != nil {
			log.Error().Err(markErr).Msg("failed to mark unqueued emails as failed")
		}
		return nil, echo.NewHTTPError(http.StatusServiceUnavailable, "Failed to queue emails, please retry")
	}

	log.Info().Int("count", len(ids)).Str("user_id", userID.String()).Msg("emails queued")

	out := make([]emailID, len(ids))
	for i, id := range ids {
		out[i] = emailID{ID: id}
	}
	return out, nil
}
