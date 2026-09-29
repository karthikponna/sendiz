package mailer

import (
	"context"
	"fmt"
	"net/mail"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/sesv2"
	"github.com/aws/aws-sdk-go-v2/service/sesv2/types"
)

type SESConfig struct {
	Region string
	// Optional; when empty the default AWS credential chain is used.
	AccessKeyID     string
	SecretAccessKey string
	Timeout         time.Duration
}

// SES sends through the Amazon SES v2 HTTPS API (port 443), for hosts that block
// outbound SMTP.
type SES struct {
	client  *sesv2.Client
	timeout time.Duration
}

func NewSES(ctx context.Context, cfg SESConfig) (*SES, error) {
	opts := []func(*awsconfig.LoadOptions) error{awsconfig.WithRegion(cfg.Region)}
	if cfg.AccessKeyID != "" {
		opts = append(opts, awsconfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(cfg.AccessKeyID, cfg.SecretAccessKey, ""),
		))
	}
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}
	return &SES{client: sesv2.NewFromConfig(awsCfg), timeout: cfg.Timeout}, nil
}

// Send returns nil once SES has accepted the message, not when it reaches the inbox.
func (s *SES) Send(ctx context.Context, msg Message) error {
	from, err := mail.ParseAddress(msg.From)
	if err != nil {
		return permanentError{fmt.Errorf("invalid from address: %w", err)}
	}
	to, err := mail.ParseAddress(msg.To)
	if err != nil {
		return permanentError{fmt.Errorf("invalid to address: %w", err)}
	}

	body := &types.Body{}
	if msg.HTML != "" {
		body.Html = &types.Content{Data: aws.String(msg.HTML), Charset: aws.String("UTF-8")}
	}
	if msg.Text != "" {
		body.Text = &types.Content{Data: aws.String(msg.Text), Charset: aws.String("UTF-8")}
	}

	ctx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	_, err = s.client.SendEmail(ctx, &sesv2.SendEmailInput{
		FromEmailAddress: aws.String(from.String()),
		Destination:      &types.Destination{ToAddresses: []string{to.String()}},
		Content: &types.EmailContent{Simple: &types.Message{
			Subject: &types.Content{Data: aws.String(msg.Subject), Charset: aws.String("UTF-8")},
			Body:    body,
		}},
	})
	if err != nil {
		return fmt.Errorf("ses send: %w", err)
	}
	return nil
}
