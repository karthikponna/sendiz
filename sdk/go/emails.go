package sendiz

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

// MaxBatchSize is the most emails the API accepts in one request.
const MaxBatchSize = 100

type EmailsService struct {
	client *Client
}

type SendEmailRequest struct {
	From    string `json:"from"`
	To      string `json:"to"`
	Subject string `json:"subject"`
	HTML    string `json:"html,omitempty"`
	Text    string `json:"text,omitempty"`
}

type SendEmailResponse struct {
	ID string `json:"id"`
}

type EmailStatus string

const (
	StatusQueued  EmailStatus = "queued"
	StatusSending EmailStatus = "sending"
	StatusSent    EmailStatus = "sent"
	StatusFailed  EmailStatus = "failed"
)

type Email struct {
	ID        string      `json:"id"`
	From      string      `json:"from"`
	To        string      `json:"to"`
	Subject   string      `json:"subject"`
	HTML      string      `json:"html,omitempty"`
	Text      string      `json:"text,omitempty"`
	Status    EmailStatus `json:"status"`
	Attempts  int         `json:"attempts"`
	LastError string      `json:"last_error,omitempty"`
	SentAt    *time.Time  `json:"sent_at,omitempty"`
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`
}

// Send queues one email. It returns as soon as the email is queued; use Get to follow
// its status.
func (s *EmailsService) Send(ctx context.Context, req *SendEmailRequest) (*SendEmailResponse, error) {
	if req == nil {
		return nil, fmt.Errorf("sendiz: request is nil")
	}
	resp, err := s.SendBatch(ctx, []SendEmailRequest{*req})
	if err != nil {
		return nil, err
	}
	return &resp[0], nil
}

// SendBatch queues up to MaxBatchSize emails in one request. The returned IDs are in the
// same order as reqs.
func (s *EmailsService) SendBatch(ctx context.Context, reqs []SendEmailRequest) ([]SendEmailResponse, error) {
	if len(reqs) == 0 || len(reqs) > MaxBatchSize {
		return nil, fmt.Errorf("sendiz: batch must contain 1 to %d emails, got %d", MaxBatchSize, len(reqs))
	}

	var out struct {
		Data []SendEmailResponse `json:"data"`
	}
	body := map[string]any{"emails": reqs}
	if err := s.client.do(ctx, http.MethodPost, "/email", body, &out); err != nil {
		return nil, err
	}
	return out.Data, nil
}

// Get returns an email and its current delivery status.
func (s *EmailsService) Get(ctx context.Context, id string) (*Email, error) {
	var email Email
	if err := s.client.do(ctx, http.MethodGet, "/email/"+url.PathEscape(id), nil, &email); err != nil {
		return nil, err
	}
	return &email, nil
}
