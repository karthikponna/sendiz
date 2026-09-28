package logger

import (
	"os"
	"time"

	"github.com/rs/zerolog"
)

var Log = zerolog.New(zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.DateTime}).
	With().
	Timestamp().
	Logger()
