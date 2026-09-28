# Needs the API + worker running (cd ../backend && make infra-up && make run) and an
# API key from the dashboard. Pass it as key=sdz_... or export SENDIZ_API_KEY.
key ?= $(SENDIZ_API_KEY)
to ?= test@example.com
n ?= 50

.PHONY: help single batch all

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-8s %s\n", $$1, $$2}'

single: ## Send one HTML email: make single key=sdz_... [to=you@example.com]
	@test -n "$(key)" || (echo "usage: make single key=sdz_... [to=you@example.com]" && exit 1)
	SENDIZ_API_KEY=$(key) go run . -mode single -to $(to)

batch: ## Send n HTML emails at once (default 50): make batch key=sdz_... [n=500]
	@test -n "$(key)" || (echo "usage: make batch key=sdz_... [n=50]" && exit 1)
	SENDIZ_API_KEY=$(key) go run . -mode batch -batch $(n)

all: ## Send the single email, then the batch
	@test -n "$(key)" || (echo "usage: make all key=sdz_... [to=you@example.com] [n=50]" && exit 1)
	SENDIZ_API_KEY=$(key) go run . -mode all -to $(to) -batch $(n)
