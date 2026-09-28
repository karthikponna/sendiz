package database

import (
	"context"
	"embed"
	"fmt"

	"github.com/pressly/goose/v3"
	"gorm.io/gorm"
)

//go:embed migrations/*.sql
var migrations embed.FS

// Migrate runs the embedded goose migrations. direction is "up", "down" or "status".
func Migrate(ctx context.Context, db *gorm.DB, direction string) error {
	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("get sql.DB: %w", err)
	}

	goose.SetBaseFS(migrations)
	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}

	switch direction {
	case "up":
		return goose.UpContext(ctx, sqlDB, "migrations")
	case "down":
		return goose.DownContext(ctx, sqlDB, "migrations")
	case "status":
		return goose.StatusContext(ctx, sqlDB, "migrations")
	default:
		return fmt.Errorf("unknown migrate direction %q (use up, down or status)", direction)
	}
}
