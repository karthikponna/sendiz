package queue

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

const (
	EmailStream = "emails:send"
	EmailGroup  = "email-workers"
	EmailIDKey  = "email_id"
)

func Connect(ctx context.Context, redisURL string) (*redis.Client, error) {
	if redisURL == "" {
		return nil, fmt.Errorf("REDIS_URL is not set")
	}

	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parse Redis URL: %w", err)
	}

	client := redis.NewClient(opt)
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("ping Redis: %w", err)
	}
	return client, nil
}

// EnsureGroup creates the stream and consumer group if they don't exist yet.
func EnsureGroup(ctx context.Context, rdb *redis.Client) error {
	err := rdb.XGroupCreateMkStream(ctx, EmailStream, EmailGroup, "0").Err()
	if err != nil && !strings.HasPrefix(err.Error(), "BUSYGROUP") {
		return fmt.Errorf("create consumer group: %w", err)
	}
	return nil
}

// Enqueue adds one stream entry per email ID in a single round trip.
func Enqueue(ctx context.Context, rdb *redis.Client, ids []uuid.UUID) error {
	_, err := rdb.Pipelined(ctx, func(p redis.Pipeliner) error {
		for _, id := range ids {
			p.XAdd(ctx, &redis.XAddArgs{
				Stream: EmailStream,
				Values: map[string]any{EmailIDKey: id.String()},
			})
		}
		return nil
	})
	return err
}

// Ack marks entries as processed and removes them so the stream doesn't grow forever.
func Ack(ctx context.Context, rdb *redis.Client, ids ...string) error {
	_, err := rdb.Pipelined(ctx, func(p redis.Pipeliner) error {
		p.XAck(ctx, EmailStream, EmailGroup, ids...)
		p.XDel(ctx, EmailStream, ids...)
		return nil
	})
	return err
}
