package model

import (
	"time"

	"github.com/google/uuid"
)

// Base holds the columns every table has. IDs are generated in Go (UUIDv7) rather than by Postgres.
type Base struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
