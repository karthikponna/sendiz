-- +goose Up
-- One row per user per UTC day; count is how many emails they queued that day.
CREATE TABLE email_usage (
    user_id UUID NOT NULL REFERENCES neon_auth."user" (id) ON DELETE CASCADE,
    day     DATE NOT NULL,
    count   INT  NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
);

-- +goose Down
DROP TABLE email_usage;
