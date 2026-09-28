-- +goose Up
-- Existing rows were sent before accounts existed and have no owner.
DELETE FROM emails;

ALTER TABLE emails
    ADD COLUMN user_id UUID NOT NULL REFERENCES neon_auth."user" (id) ON DELETE CASCADE;

CREATE INDEX emails_user_id_id_idx ON emails (user_id, id DESC);

CREATE TABLE api_keys (
    id           UUID PRIMARY KEY,
    user_id      UUID        NOT NULL REFERENCES neon_auth."user" (id) ON DELETE CASCADE,
    name         TEXT        NOT NULL,
    prefix       TEXT        NOT NULL,
    key_hash     TEXT        NOT NULL UNIQUE,
    last_used_at TIMESTAMPTZ,
    revoked_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX api_keys_user_id_created_at_idx ON api_keys (user_id, created_at DESC);

-- +goose Down
DROP TABLE api_keys;
DROP INDEX emails_user_id_id_idx;
ALTER TABLE emails DROP COLUMN user_id;
