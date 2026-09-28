package apikey

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"strings"
)

const (
	Prefix       = "sdz_"
	displayChars = 12
)

// Generate returns a new key, the short prefix shown in the dashboard, and the hash to store.
func Generate() (key, prefix, hash string) {
	b := make([]byte, 24)
	rand.Read(b)
	key = Prefix + hex.EncodeToString(b)
	return key, key[:displayChars], Hash(key)
}

// Hash is plain SHA-256: keys are 192 random bits, so a slow password hash adds nothing
// except latency on every API request.
func Hash(key string) string {
	sum := sha256.Sum256([]byte(key))
	return hex.EncodeToString(sum[:])
}

func Looks(key string) bool {
	return strings.HasPrefix(key, Prefix) && len(key) == len(Prefix)+48
}
