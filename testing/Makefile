# Needs the API + worker running (cd ../backend && make infra-up && make run) and an
# API key from the dashboard. Pass it as key=sdz_... or export SENDIZ_API_KEY.
#
# Targets the local API by default. For production use base=https://api.sendiz.dev; there
# the free plan only allows sending to your own login email, 5 emails a day, so only
# `make single to=<your login email>` works.
key ?= $(SENDIZ_API_KEY)
base ?= http://localhost:8080
to ?= test@example.com
n ?= 50

run = SENDIZ_API_KEY=$(key) SENDIZ_BASE_URL=$(base) go run .

.PHONY: help single batch all

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-8s %s\n", $$1, $$2}'

single: ## Send one HTML email: make single key=sdz_... [to=you@example.com] [base=URL]
	@test -n "$(key)" || (echo "usage: make single key=sdz_... [to=you@example.com]" && exit 1)
	$(run) -mode single -to $(to)

batch: ## Send n HTML emails at once (default 50): make batch key=sdz_... [n=500]
	@test -n "$(key)" || (echo "usage: make batch key=sdz_... [n=50]" && exit 1)
	$(run) -mode batch -batch $(n)

all: ## Send the single email, then the batch
	@test -n "$(key)" || (echo "usage: make all key=sdz_... [to=you@example.com] [n=50]" && exit 1)
	$(run) -mode all -to $(to) -batch $(n)
