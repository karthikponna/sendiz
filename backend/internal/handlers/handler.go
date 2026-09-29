package handlers

import (
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"github.com/karthikponna/sendiz/backend/internal/logger"
)

var log = logger.Log

type Handler struct {
	DB  *gorm.DB
	RDB *redis.Client

	// EmailFrom replaces the sender address when OnlySendToSelf is on.
	EmailFrom string
	// DailyLimit caps emails per user per UTC day; 0 disables the cap.
	DailyLimit int
	// OnlySendToSelf restricts recipients to the user's own verified login email.
	OnlySendToSelf bool
}
