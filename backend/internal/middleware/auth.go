package middleware

import (
	"net/http"
	"strings"

	"github.com/google/uuid"
	echojwt "github.com/labstack/echo-jwt/v5"
	"github.com/labstack/echo/v5"

	"github.com/karthikponna/sendiz/backend/internal/auth"
	"github.com/karthikponna/sendiz/backend/internal/logger"
)

const (
	userIDKey = "user_id"
	userKey   = "user"
)

// RequireUser protects dashboard routes with a Neon Auth JWT sent as a Bearer token.
func RequireUser(v *auth.Verifier) echo.MiddlewareFunc {
	return echojwt.WithConfig(echojwt.Config{
		ContextKey: userKey,
		ParseTokenFunc: func(c *echo.Context, token string) (any, error) {
			return v.Verify(token)
		},
		SuccessHandler: func(c *echo.Context) error {
			c.Set(userIDKey, CurrentUser(c).ID)
			return nil
		},
		ErrorHandler: func(c *echo.Context, err error) error {
			logger.Log.Debug().Err(err).Msg("rejected dashboard token")
			return echo.NewHTTPError(http.StatusUnauthorized, "Invalid or expired session")
		},
	})
}

// UserID returns the ID set by RequireUser or RequireAPIKey.
func UserID(c *echo.Context) uuid.UUID {
	id, _ := c.Get(userIDKey).(uuid.UUID)
	return id
}

// CurrentUser returns the dashboard user set by RequireUser.
func CurrentUser(c *echo.Context) auth.User {
	u, _ := c.Get(userKey).(auth.User)
	return u
}

func bearerToken(c *echo.Context) (string, bool) {
	h := c.Request().Header.Get("Authorization")
	token, ok := strings.CutPrefix(h, "Bearer ")
	token = strings.TrimSpace(token)
	return token, ok && token != ""
}
