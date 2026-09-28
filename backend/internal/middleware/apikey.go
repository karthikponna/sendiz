package middleware

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/labstack/echo/v5"
	"gorm.io/gorm"

	"github.com/karthikponna/sendiz/backend/internal/apikey"
	"github.com/karthikponna/sendiz/backend/internal/logger"
	"github.com/karthikponna/sendiz/backend/internal/model"
)

// lastUsedEvery limits last_used_at writes so busy keys don't cause a DB write per request.
const lastUsedEvery = time.Minute

// RequireAPIKey protects the sending API with a "Bearer sdz_..." key.
func RequireAPIKey(db *gorm.DB) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			key, ok := bearerToken(c)
			if !ok || !apikey.Looks(key) {
				return echo.NewHTTPError(http.StatusUnauthorized, "Missing or malformed API key")
			}

			var k model.APIKey
			err := db.WithContext(c.Request().Context()).
				Where("key_hash = ? AND revoked_at IS NULL", apikey.Hash(key)).
				Take(&k).Error
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return echo.NewHTTPError(http.StatusUnauthorized, "Invalid API key")
			}
			if err != nil {
				logger.Log.Error().Err(err).Msg("failed to look up API key")
				return echo.NewHTTPError(http.StatusInternalServerError, "Failed to check API key")
			}

			if k.LastUsedAt == nil || time.Since(*k.LastUsedAt) > lastUsedEvery {
				go touchLastUsed(db, k)
			}

			c.Set(userIDKey, k.UserID)
			return next(c)
		}
	}
}

func touchLastUsed(db *gorm.DB, k model.APIKey) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	err := db.WithContext(ctx).Model(&model.APIKey{}).Where("id = ?", k.ID).
		Update("last_used_at", gorm.Expr("now()")).Error
	if err != nil {
		logger.Log.Warn().Err(err).Str("api_key_id", k.ID.String()).Msg("failed to update last_used_at")
	}
}
