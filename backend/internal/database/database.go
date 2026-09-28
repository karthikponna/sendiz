package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

func Connect(ctx context.Context, databaseURL string, maxOpenConns int) (*gorm.DB, error) {
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is not set")
	}

	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{
		// Every write here is a single statement, so GORM's implicit BEGIN/COMMIT
		// would only add two extra round trips per query.
		SkipDefaultTransaction: true,
		Logger: gormlogger.New(log.New(os.Stdout, "", log.LstdFlags), gormlogger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  gormlogger.Warn,
			IgnoreRecordNotFoundError: true,
		}),
	})
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("get sql.DB: %w", err)
	}
	sqlDB.SetMaxOpenConns(maxOpenConns)
	sqlDB.SetMaxIdleConns(maxOpenConns)
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)

	// Neon can take a few seconds to wake a suspended compute.
	pingCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	if err := sqlDB.PingContext(pingCtx); err != nil {
		return nil, fmt.Errorf("ping database: %w", err)
	}
	return db, nil
}
