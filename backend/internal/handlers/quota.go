package handlers

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v5"
	"gorm.io/gorm"
)

var errQuotaExceeded = errors.New("daily email limit reached")

// Days roll over at midnight UTC, matching the SQL below.
const usageDay = `(now() AT TIME ZONE 'UTC')::date`

type sender struct {
	Email         string
	EmailVerified bool
}

// loadSender reads the user's login email from Neon Auth. API-key requests only carry the
// user id, so this is the one source of truth for who is sending.
func (h *Handler) loadSender(ctx context.Context, userID uuid.UUID) (sender, error) {
	var s sender
	res := h.DB.WithContext(ctx).
		Raw(`SELECT email, "emailVerified" AS email_verified FROM neon_auth."user" WHERE id = ?`, userID).
		Scan(&s)
	if res.Error != nil {
		return s, res.Error
	}
	if res.RowsAffected == 0 {
		return s, gorm.ErrRecordNotFound
	}
	return s, nil
}

// checkRecipients enforces the free plan: a verified account, and every email addressed
// to that account's own login email.
func (h *Handler) checkRecipients(s sender, inputs []EmailInput) error {
	if !s.EmailVerified {
		return echo.NewHTTPError(http.StatusForbidden, "Verify your email address before sending")
	}
	for _, in := range inputs {
		addr, err := mail.ParseAddress(in.To)
		if err != nil || !strings.EqualFold(addr.Address, s.Email) {
			return echo.NewHTTPError(http.StatusForbidden,
				fmt.Sprintf("On the free plan you can only send to your own address (%s)", s.Email))
		}
	}
	return nil
}

// reserveQuota adds n to today's count in one statement, so concurrent requests can't
// both slip under the limit. It must run in the same transaction as the email insert.
func reserveQuota(tx *gorm.DB, userID uuid.UUID, n, limit int) error {
	if n > limit {
		return errQuotaExceeded
	}
	var counts []int
	err := tx.Raw(`
		INSERT INTO email_usage (user_id, day, count)
		VALUES (?, `+usageDay+`, ?)
		ON CONFLICT (user_id, day) DO UPDATE SET count = email_usage.count + EXCLUDED.count
		WHERE email_usage.count + EXCLUDED.count <= ?
		RETURNING count`, userID, n, limit).Scan(&counts).Error
	if err != nil {
		return err
	}
	if len(counts) == 0 {
		return errQuotaExceeded
	}
	return nil
}

func (h *Handler) usedToday(ctx context.Context, userID uuid.UUID) (int, error) {
	var used int
	err := h.DB.WithContext(ctx).
		Raw(`SELECT COALESCE(SUM(count), 0) FROM email_usage WHERE user_id = ? AND day = `+usageDay, userID).
		Scan(&used).Error
	return used, err
}

func nextReset() time.Time {
	now := time.Now().UTC()
	return time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, time.UTC)
}

func (h *Handler) quotaExceededError() error {
	return echo.NewHTTPError(http.StatusTooManyRequests, fmt.Sprintf(
		"Daily limit reached (%d emails per day). Resets at %s",
		h.DailyLimit, nextReset().Format("15:04 MST, Jan 2")))
}
