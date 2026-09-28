package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v5"
	"gorm.io/gorm"

	"github.com/karthikponna/sendiz/backend/internal/apikey"
	"github.com/karthikponna/sendiz/backend/internal/middleware"
	"github.com/karthikponna/sendiz/backend/internal/model"
)

const maxKeyNameLength = 50

type createAPIKeyRequest struct {
	Name string `json:"name"`
}

type createAPIKeyResponse struct {
	model.APIKey
	// Key is only ever returned here; the database keeps just its hash.
	Key string `json:"key"`
}

func (h *Handler) ListAPIKeys(c *echo.Context) error {
	var keys []model.APIKey
	err := h.DB.WithContext(c.Request().Context()).
		Where("user_id = ? AND revoked_at IS NULL", middleware.UserID(c)).
		Order("created_at DESC").
		Find(&keys).Error
	if err != nil {
		log.Error().Err(err).Msg("failed to list API keys")
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to list API keys")
	}
	return c.JSON(http.StatusOK, map[string]any{"data": keys})
}

func (h *Handler) CreateAPIKey(c *echo.Context) error {
	var req createAPIKeyRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid JSON body")
	}
	name := strings.TrimSpace(req.Name)
	if name == "" || len(name) > maxKeyNameLength {
		return echo.NewHTTPError(http.StatusBadRequest, "Name must be 1 to 50 characters")
	}

	id, err := uuid.NewV7()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to generate key id")
	}
	key, prefix, hash := apikey.Generate()
	k := model.APIKey{
		ID:        id,
		UserID:    middleware.UserID(c),
		Name:      name,
		Prefix:    prefix,
		KeyHash:   hash,
		CreatedAt: time.Now(),
	}
	if err := h.DB.WithContext(c.Request().Context()).Create(&k).Error; err != nil {
		log.Error().Err(err).Msg("failed to create API key")
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create API key")
	}
	return c.JSON(http.StatusCreated, createAPIKeyResponse{APIKey: k, Key: key})
}

func (h *Handler) RevokeAPIKey(c *echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid API key id")
	}
	res := h.DB.WithContext(c.Request().Context()).Model(&model.APIKey{}).
		Where("id = ? AND user_id = ? AND revoked_at IS NULL", id, middleware.UserID(c)).
		Update("revoked_at", gorm.Expr("now()"))
	if res.Error != nil {
		log.Error().Err(res.Error).Msg("failed to revoke API key")
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to revoke API key")
	}
	if res.RowsAffected == 0 {
		return echo.NewHTTPError(http.StatusNotFound, "API key not found")
	}
	return c.NoContent(http.StatusNoContent)
}
