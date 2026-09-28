package model

import (
	"time"

	"github.com/google/uuid"
)

// APIKey stores only the SHA-256 hash of a key; the full key is shown to the user once.
type APIKey struct {
	ID         uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	UserID     uuid.UUID  `gorm:"type:uuid" json:"-"`
	Name       string     `json:"name"`
	Prefix     string     `json:"prefix"`
	KeyHash    string     `json:"-"`
	LastUsedAt *time.Time `json:"last_used_at"`
	RevokedAt  *time.Time `json:"revoked_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
}

func (APIKey) TableName() string { return "api_keys" }
