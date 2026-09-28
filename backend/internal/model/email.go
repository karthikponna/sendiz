package model

import (
	"time"

	"github.com/google/uuid"
)

type EmailStatus string

const (
	StatusQueued  EmailStatus = "queued"
	StatusSending EmailStatus = "sending"
	StatusSent    EmailStatus = "sent"
	StatusFailed  EmailStatus = "failed"
)

type Email struct {
	Base
	UserID    uuid.UUID   `gorm:"type:uuid" json:"-"`
	From      string      `gorm:"column:from_address" json:"from"`
	To        string      `gorm:"column:to_address" json:"to"`
	Subject   string      `json:"subject"`
	HTML      string      `json:"html,omitempty"`
	Text      string      `json:"text,omitempty"`
	Status    EmailStatus `json:"status"`
	Attempts  int         `json:"attempts"`
	LastError string      `json:"last_error,omitempty"`
	SentAt    *time.Time  `json:"sent_at,omitempty"`
}
