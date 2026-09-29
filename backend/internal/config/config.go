package config

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/karthikponna/sendiz/backend/internal/logger"

	"github.com/knadh/koanf/parsers/dotenv"
	"github.com/knadh/koanf/providers/confmap"
	"github.com/knadh/koanf/providers/env"
	"github.com/knadh/koanf/providers/file"
	"github.com/knadh/koanf/v2"
)

var defaults = map[string]any{
	"PORT":             "8080",
	"REDIS_URL":        "redis://localhost:6379",
	"WORKER_COUNT":     10,
	"MAX_ATTEMPTS":     3,
	"RETRY_AFTER":      "30s",
	"MAILER":           "smtp",
	"AWS_REGION":       "us-east-2",
	"SMTP_HOST":        "localhost",
	"SMTP_PORT":        1025,
	"SMTP_TIMEOUT":     "15s",
	"DB_MAX_OPEN_CONN": 20,

	// Free plan: users may only email their own verified address, a few times a day.
	"EMAIL_FROM":        "Sendiz <onboarding@sendiz.dev>",
	"DAILY_EMAIL_LIMIT": 5, // 0 means unlimited
	"ONLY_SEND_TO_SELF": true,
}

// Load applies defaults, then the nearest .env (searching up from the working
// directory), then real environment variables, each overriding the previous.
func Load() (*koanf.Koanf, error) {
	k := koanf.New(".")

	if err := k.Load(confmap.Provider(defaults, "."), nil); err != nil {
		return nil, fmt.Errorf("load defaults: %w", err)
	}

	if path, ok := findEnvFile(); ok {
		if err := k.Load(file.Provider(path), dotenv.Parser()); err != nil {
			return nil, fmt.Errorf("load %s: %w", path, err)
		}
	} else {
		logger.Log.Warn().Msg(".env not found, using environment variables only")
	}

	if err := k.Load(env.Provider("", ".", func(s string) string { return s }), nil); err != nil {
		return nil, fmt.Errorf("load env vars: %w", err)
	}
	return k, nil
}

func findEnvFile() (string, bool) {
	dir, err := os.Getwd()
	if err != nil {
		return "", false
	}
	for {
		path := filepath.Join(dir, ".env")
		if _, err := os.Stat(path); err == nil {
			return path, true
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", false
		}
		dir = parent
	}
}
