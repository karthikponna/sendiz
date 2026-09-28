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
}
