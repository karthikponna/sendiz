-- +goose Up
CREATE TABLE emails (
    id           UUID PRIMARY KEY,
    from_address TEXT        NOT NULL,
    to_address   TEXT        NOT NULL,
    subject      TEXT        NOT NULL DEFAULT '',
    html         TEXT        NOT NULL DEFAULT '',
    text         TEXT        NOT NULL DEFAULT '',
    status       TEXT        NOT NULL DEFAULT 'queued'
                 CHECK (status IN ('queued', 'sending', 'sent', 'failed')),
    attempts     INT         NOT NULL DEFAULT 0,
    last_error   TEXT        NOT NULL DEFAULT '',
    sent_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE emails;
