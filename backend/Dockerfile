# Build from the repository root (go.mod lives there):
#   docker build -f backend/Dockerfile -t sendiz .
# One image runs every role: the default is the API, pass "worker" or "migrate up" instead.
FROM golang:1.27-alpine AS build
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY backend ./backend
ENV GOWORK=off CGO_ENABLED=0
RUN go build -trimpath -ldflags="-s -w" -o /out/sendiz ./backend/cmd

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/sendiz /app/sendiz
ENTRYPOINT ["/app/sendiz"]
CMD ["api"]
