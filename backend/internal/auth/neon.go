package auth

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// User is the signed-in dashboard user, taken from a verified Neon Auth JWT.
type User struct {
	ID    uuid.UUID `json:"id"`
	Email string    `json:"email"`
	Name  string    `json:"name"`
}

// Verifier checks JWTs issued by Neon Auth (Managed Better Auth) against its JWKS.
type Verifier struct {
	keys   keyfunc.Keyfunc
	issuer string
}

type claims struct {
	Email string `json:"email"`
	Name  string `json:"name"`
	jwt.RegisteredClaims
}

// NewVerifier fetches the JWKS once and keeps it refreshed in the background until ctx ends.
func NewVerifier(ctx context.Context, baseURL string) (*Verifier, error) {
	if baseURL == "" {
		return nil, errors.New("NEON_AUTH_BASE_URL is not set")
	}
	u, err := url.Parse(baseURL)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return nil, fmt.Errorf("invalid NEON_AUTH_BASE_URL %q", baseURL)
	}

	keys, err := keyfunc.NewDefaultCtx(ctx, []string{strings.TrimRight(baseURL, "/") + "/.well-known/jwks.json"})
	if err != nil {
		return nil, fmt.Errorf("load Neon Auth JWKS: %w", err)
	}
	// Neon Auth sets both iss and aud to the origin of the auth URL.
	return &Verifier{keys: keys, issuer: u.Scheme + "://" + u.Host}, nil
}

func (v *Verifier) Verify(token string) (User, error) {
	var c claims
	_, err := jwt.ParseWithClaims(token, &c, v.keys.Keyfunc,
		jwt.WithValidMethods([]string{"EdDSA"}),
		jwt.WithIssuer(v.issuer),
		jwt.WithAudience(v.issuer),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return User{}, err
	}

	id, err := uuid.Parse(c.Subject)
	if err != nil {
		return User{}, fmt.Errorf("invalid subject: %w", err)
	}
	return User{ID: id, Email: c.Email, Name: c.Name}, nil
}
