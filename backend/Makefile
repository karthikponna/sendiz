API_URL ?= http://localhost:8080
MIGRATIONS_DIR := internal/database/migrations

.PHONY: help run api worker build tidy vet \
	migrate-up migrate-down migrate-status migrate-create \
	infra-up infra-down redis-up mailpit-up \
	frontend sdk-example send-test send-batch

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'

## ---------- run ----------

run: ## Run API + worker in one process
	go run ./cmd serve

api: ## Run only the HTTP API
	go run ./cmd api

worker: ## Run only the worker (start several of these to scale sending)
	go run ./cmd worker

build: ## Build the binary into bin/sendiz
	go build -o bin/sendiz ./cmd

tidy: ## Tidy Go modules
	go mod tidy

vet: ## Run go vet
	go vet ./...

## ---------- database ----------

migrate-up: ## Apply all pending migrations
	go run ./cmd migrate up

migrate-down: ## Roll back the latest migration
	go run ./cmd migrate down

migrate-status: ## Show migration status
	go run ./cmd migrate status

migrate-create: ## Create a new migration: make migrate-create name=add_users_table
	@test -n "$(name)" || (echo "usage: make migrate-create name=add_users_table" && exit 1)
	@f=$(MIGRATIONS_DIR)/$$(date -u +%Y%m%d%H%M%S)_$(name).sql; \
		printf -- '-- +goose Up\n\n-- +goose Down\n' > $$f; \
		echo "created $$f"

## ---------- local infra (Docker) ----------

infra-up: redis-up mailpit-up ## Start Redis and Mailpit

redis-up: ## Start Redis on :6379 (reuses the container if it already exists)
	@docker start sendiz-redis 2>/dev/null || docker run -d --name sendiz-redis -p 6379:6379 redis:8-alpine

mailpit-up: ## Start Mailpit (SMTP on :1025, inbox UI on http://localhost:8025)
	@docker start sendiz-mailpit 2>/dev/null || docker run -d --name sendiz-mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit

infra-down: ## Stop and remove Redis and Mailpit
	-docker rm -f sendiz-redis sendiz-mailpit

## ---------- frontend + SDK ----------

frontend: ## Run the website + dashboard on http://localhost:5173
	cd ../frontend && bun install && bun run dev

sdk-example: ## Send one email with the Go SDK: make sdk-example key=sdz_... to=you@example.com
	@test -n "$(key)" || (echo "usage: make sdk-example key=sdz_... [to=you@example.com]" && exit 1)
	cd ../sdk/go && SENDIZ_API_KEY=$(key) SENDIZ_BASE_URL=$(API_URL) go run ./examples/send $(to)

## ---------- try it (needs an API key from the dashboard) ----------

send-test: ## Send one test email: make send-test key=sdz_...
	@test -n "$(key)" || (echo "usage: make send-test key=sdz_..." && exit 1)
	curl -s -X POST $(API_URL)/email \
		-H 'Authorization: Bearer $(key)' \
		-H 'Content-Type: application/json' \
		-d '{"emails":[{"from":"Sendiz <hello@sendiz.dev>","to":"someone@example.com","subject":"Hello from Sendiz","html":"<h1>It works!</h1>","text":"It works!"}]}'
	@echo

send-batch: ## Send a batch of test emails: make send-batch key=sdz_... n=100
	@test -n "$(key)" || (echo "usage: make send-batch key=sdz_... n=100" && exit 1)
	@n=$${n:-100}; \
		body=$$(awk -v n=$$n 'BEGIN { printf "{\"emails\":["; for (i = 1; i <= n; i++) { printf "%s{\"from\":\"hello@sendiz.dev\",\"to\":\"user%d@example.com\",\"subject\":\"Batch email %d\",\"text\":\"Email %d of %d\"}", (i > 1 ? "," : ""), i, i, i, n }; printf "]}" }'); \
		curl -s -X POST $(API_URL)/email -H 'Authorization: Bearer $(key)' -H 'Content-Type: application/json' -d "$$body"
	@echo
