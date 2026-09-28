package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"

	"github.com/knadh/koanf/v2"
	"github.com/labstack/echo/v5"
	echomw "github.com/labstack/echo/v5/middleware"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"github.com/karthikponna/sendiz/backend/internal/auth"
	"github.com/karthikponna/sendiz/backend/internal/config"
	"github.com/karthikponna/sendiz/backend/internal/database"
	"github.com/karthikponna/sendiz/backend/internal/handlers"
	"github.com/karthikponna/sendiz/backend/internal/logger"
	"github.com/karthikponna/sendiz/backend/internal/mailer"
	"github.com/karthikponna/sendiz/backend/internal/middleware"
	"github.com/karthikponna/sendiz/backend/internal/queue"
	"github.com/karthikponna/sendiz/backend/internal/worker"
)

var log = logger.Log

const usage = `usage: sendiz <command>

commands:
  serve                      run the API and the worker in one process (default)
  api                        run only the HTTP API
  worker                     run only the email worker
  migrate [up|down|status]   run database migrations (default: up)`

func main() {
	command := "serve"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	k, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("failed to load config")
	}

	switch command {
	case "migrate":
		direction := "up"
		if len(os.Args) > 2 {
			direction = os.Args[2]
		}
		db := mustConnectDB(ctx, k)
		if err := database.Migrate(ctx, db, direction); err != nil {
			log.Fatal().Err(err).Msg("migration failed")
		}
	case "api", "worker", "serve":
		db := mustConnectDB(ctx, k)
		rdb := mustConnectRedis(ctx, k)
		defer rdb.Close()
		if err := run(ctx, stop, command, k, db, rdb); err != nil {
			log.Fatal().Err(err).Msg("stopped with error")
		}
	default:
		fmt.Fprintln(os.Stderr, usage)
		os.Exit(2)
	}
}

func run(ctx context.Context, stop context.CancelFunc, command string, k *koanf.Koanf, db *gorm.DB, rdb *redis.Client) error {
	var wg sync.WaitGroup
	errs := make(chan error, 2)

	if command == "api" || command == "serve" {
		wg.Go(func() {
			errs <- runAPI(ctx, k, db, rdb)
			stop()
		})
	}
	if command == "worker" || command == "serve" {
		w := worker.New(db, rdb, mailer.New(mailer.Config{
			Host:     k.String("SMTP_HOST"),
			Port:     k.Int("SMTP_PORT"),
			Username: k.String("SMTP_USERNAME"),
			Password: k.String("SMTP_PASSWORD"),
			Timeout:  k.Duration("SMTP_TIMEOUT"),
		}), worker.Config{
			Concurrency: k.Int("WORKER_COUNT"),
			MaxAttempts: k.Int("MAX_ATTEMPTS"),
			RetryAfter:  k.Duration("RETRY_AFTER"),
		})
		wg.Go(func() {
			errs <- w.Run(ctx)
			stop()
		})
	}

	wg.Wait()
	close(errs)
	var all []error
	for err := range errs {
		all = append(all, err)
	}
	return errors.Join(all...)
}

func mustConnectDB(ctx context.Context, k *koanf.Koanf) *gorm.DB {
	db, err := database.Connect(ctx, k.String("DATABASE_URL"), k.Int("DB_MAX_OPEN_CONN"))
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to Postgres")
	}
	log.Info().Msg("connected to Postgres")
	return db
}

func mustConnectRedis(ctx context.Context, k *koanf.Koanf) *redis.Client {
	rdb, err := queue.Connect(ctx, k.String("REDIS_URL"))
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to Redis")
	}
	log.Info().Msg("connected to Redis")
	return rdb
}

func runAPI(ctx context.Context, k *koanf.Koanf, db *gorm.DB, rdb *redis.Client) error {
	verifier, err := auth.NewVerifier(ctx, k.String("NEON_AUTH_BASE_URL"))
	if err != nil {
		return err
	}
	h := &handlers.Handler{DB: db, RDB: rdb}
	requireAPIKey := middleware.RequireAPIKey(db)

	e := echo.New()
	e.Use(echomw.Recover())
	e.Use(echomw.BodyLimit(10 << 20))

	e.GET("/health", func(c *echo.Context) error { return c.NoContent(http.StatusOK) })

	// SDK / REST API, authenticated with an API key.
	e.POST("/email", h.SendEmails, requireAPIKey)
	e.GET("/email/:id", h.GetEmail, requireAPIKey)

	// Dashboard, authenticated with the user's Neon Auth JWT.
	d := e.Group("/dashboard", middleware.RequireUser(verifier))
	d.GET("/me", h.Me)
	d.GET("/emails", h.ListEmails)
	d.POST("/test-email", h.SendTestEmail)
	d.GET("/api-keys", h.ListAPIKeys)
	d.POST("/api-keys", h.CreateAPIKey)
	d.DELETE("/api-keys/:id", h.RevokeAPIKey)

	addr := ":" + k.String("PORT")
	log.Info().Str("addr", addr).Msg("starting API server")
	return echo.StartConfig{Address: addr, HideBanner: true, HidePort: true}.Start(ctx, e)
}
