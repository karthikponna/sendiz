# Build from the repository root (go.mod lives there):
#   docker build -f backend/Dockerfile -t sendiz .
# One image runs every role. The default command runs the API; override it with
# "/app/sendiz worker" or "/app/sendiz migrate up".
FROM golang:1.27-alpine AS build
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY backend ./backend
ENV GOWORK=off CGO_ENABLED=0
RUN go build -trimpath -ldflags="-s -w" -o /out/sendiz ./backend/cmd

# Alpine rather than distroless: hosts like Railway may run custom start commands
# through /bin/sh, which distroless doesn't have.
FROM alpine:3.22
RUN apk add --no-cache ca-certificates tzdata && adduser -D -u 10001 sendiz
COPY --from=build /out/sendiz /app/sendiz
USER sendiz
CMD ["/app/sendiz", "api"]
