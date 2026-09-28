package handlers

import (
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/labstack/echo/v5"

	"github.com/karthikponna/sendiz/backend/internal/middleware"
	"github.com/karthikponna/sendiz/backend/internal/model"
)

const (
	defaultPageSize = 20
	maxPageSize     = 100
)

// The list view doesn't need the bodies, which can be large.
var emailListColumns = []string{
	"id", "from_address", "to_address", "subject", "status",
	"attempts", "last_error", "sent_at", "created_at", "updated_at",
}

func (h *Handler) Me(c *echo.Context) error {
	return c.JSON(http.StatusOK, middleware.CurrentUser(c))
}

// ListEmails pages newest-first with ?cursor=<last id seen>. IDs are UUIDv7, so ordering
// by id is ordering by creation time and the cursor query stays on the (user_id, id) index.
func (h *Handler) ListEmails(c *echo.Context) error {
	limit := defaultPageSize
	if v := c.QueryParam("limit"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid limit")
		}
		limit = min(n, maxPageSize)
	}

	q := h.DB.WithContext(c.Request().Context()).
		Select(emailListColumns).
		Where("user_id = ?", middleware.UserID(c))

	if s := model.EmailStatus(c.QueryParam("status")); s != "" {
		switch s {
		case model.StatusQueued, model.StatusSending, model.StatusSent, model.StatusFailed:
			q = q.Where("status = ?", s)
		default:
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid status")
		}
	}
	if v := c.QueryParam("cursor"); v != "" {
		cursor, err := uuid.Parse(v)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid cursor")
		}
		q = q.Where("id < ?", cursor)
	}

	var emails []model.Email
	if err := q.Order("id DESC").Limit(limit + 1).Find(&emails).Error; err != nil {
		log.Error().Err(err).Msg("failed to list emails")
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to list emails")
	}

	var next *uuid.UUID
	if len(emails) > limit {
		emails = emails[:limit]
		next = &emails[limit-1].ID
	}
	return c.JSON(http.StatusOK, map[string]any{"data": emails, "next_cursor": next})
}

// SendTestEmail powers the "Send email" button on onboarding: it goes through the same
// queue and workers as the API, addressed to the signed-in user.
func (h *Handler) SendTestEmail(c *echo.Context) error {
	user := middleware.CurrentUser(c)
	if user.Email == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Your account has no email address")
	}

	ids, err := h.queueEmails(c.Request().Context(), user.ID, []EmailInput{{
		From:    "Sendiz <onboarding@sendiz.dev>",
		To:      user.Email,
		Subject: "Hello World",
		HTML:    "<p>Congrats on sending your <strong>first email</strong>!</p>",
		Text:    "Congrats on sending your first email!",
	}})
	if err != nil {
		return err
	}
	return c.JSON(http.StatusAccepted, map[string]any{"data": ids})
}
