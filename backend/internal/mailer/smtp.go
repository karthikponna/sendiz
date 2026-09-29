package mailer

import (
	"bytes"
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
	"net"
	"net/http"
	"net/mail"
	"net/smtp"
	"net/textproto"
	"strconv"
	"strings"
	"time"

	smithyhttp "github.com/aws/smithy-go/transport/http"
)

type Config struct {
	Host     string
	Port     int
	Username string
	Password string
	Timeout  time.Duration
}

type Message struct {
	ID      string
	From    string
	To      string
	Subject string
	HTML    string
	Text    string
}

// Sender delivers one message; both the SMTP Mailer and SES implement it.
type Sender interface {
	Send(ctx context.Context, msg Message) error
}

type Mailer struct {
	cfg Config
}

func New(cfg Config) *Mailer {
	return &Mailer{cfg: cfg}
}

// permanentError marks failures that will never succeed on retry.
type permanentError struct{ err error }

func (e permanentError) Error() string { return e.err.Error() }
func (e permanentError) Unwrap() error { return e.err }

// IsPermanent reports whether err should not be retried: bad input, an SMTP 5xx reply, or
// an SES 4xx response other than 429. Everything else (SMTP 4xx replies, timeouts,
// connection errors, SES throttling and 5xx) is treated as temporary.
func IsPermanent(err error) bool {
	var pErr permanentError
	if errors.As(err, &pErr) {
		return true
	}
	var tpErr *textproto.Error
	if errors.As(err, &tpErr) {
		return tpErr.Code >= 500
	}
	var respErr *smithyhttp.ResponseError
	if errors.As(err, &respErr) {
		code := respErr.HTTPStatusCode()
		return code >= 400 && code < 500 && code != http.StatusTooManyRequests
	}
	return false
}

// Send delivers one message. A nil error means the SMTP server replied 250 (accepted),
// not that the message reached the recipient's inbox.
func (m *Mailer) Send(ctx context.Context, msg Message) error {
	from, err := mail.ParseAddress(msg.From)
	if err != nil {
		return permanentError{fmt.Errorf("invalid from address: %w", err)}
	}
	to, err := mail.ParseAddress(msg.To)
	if err != nil {
		return permanentError{fmt.Errorf("invalid to address: %w", err)}
	}

	body, err := buildMessage(msg, from, to)
	if err != nil {
		return permanentError{fmt.Errorf("build message: %w", err)}
	}

	dialer := net.Dialer{Timeout: m.cfg.Timeout}
	conn, err := dialer.DialContext(ctx, "tcp", net.JoinHostPort(m.cfg.Host, strconv.Itoa(m.cfg.Port)))
	if err != nil {
		return fmt.Errorf("dial smtp: %w", err)
	}
	// net/smtp has no context support, so bound the whole conversation with a deadline.
	if err := conn.SetDeadline(time.Now().Add(m.cfg.Timeout)); err != nil {
		conn.Close()
		return err
	}

	c, err := smtp.NewClient(conn, m.cfg.Host)
	if err != nil {
		conn.Close()
		return fmt.Errorf("smtp handshake: %w", err)
	}
	defer c.Close()

	if ok, _ := c.Extension("STARTTLS"); ok {
		if err := c.StartTLS(&tls.Config{ServerName: m.cfg.Host}); err != nil {
			return fmt.Errorf("starttls: %w", err)
		}
	}
	if m.cfg.Username != "" {
		if err := c.Auth(smtp.PlainAuth("", m.cfg.Username, m.cfg.Password, m.cfg.Host)); err != nil {
			return fmt.Errorf("smtp auth: %w", err)
		}
	}

	if err := c.Mail(from.Address); err != nil {
		return fmt.Errorf("MAIL FROM: %w", err)
	}
	if err := c.Rcpt(to.Address); err != nil {
		return fmt.Errorf("RCPT TO: %w", err)
	}
	w, err := c.Data()
	if err != nil {
		return fmt.Errorf("DATA: %w", err)
	}
	if _, err := w.Write(body); err != nil {
		return fmt.Errorf("write body: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("end DATA: %w", err)
	}

	// The message is already accepted at this point, so a failed QUIT doesn't matter.
	_ = c.Quit()
	return nil
}

func buildMessage(msg Message, from, to *mail.Address) ([]byte, error) {
	var buf bytes.Buffer
	header := func(k, v string) { fmt.Fprintf(&buf, "%s: %s\r\n", k, v) }

	domain := from.Address[strings.LastIndex(from.Address, "@")+1:]
	header("From", from.String())
	header("To", to.String())
	header("Subject", mime.QEncoding.Encode("utf-8", msg.Subject))
	header("Date", time.Now().Format(time.RFC1123Z))
	header("Message-ID", fmt.Sprintf("<%s@%s>", msg.ID, domain))
	header("MIME-Version", "1.0")

	switch {
	case msg.HTML != "" && msg.Text != "":
		var parts bytes.Buffer
		mw := multipart.NewWriter(&parts)
		if err := writePart(mw, "text/plain", msg.Text); err != nil {
			return nil, err
		}
		if err := writePart(mw, "text/html", msg.HTML); err != nil {
			return nil, err
		}
		if err := mw.Close(); err != nil {
			return nil, err
		}
		header("Content-Type", "multipart/alternative; boundary="+mw.Boundary())
		buf.WriteString("\r\n")
		buf.Write(parts.Bytes())
	case msg.HTML != "":
		if err := writeSinglePart(&buf, header, "text/html", msg.HTML); err != nil {
			return nil, err
		}
	default:
		if err := writeSinglePart(&buf, header, "text/plain", msg.Text); err != nil {
			return nil, err
		}
	}
	return buf.Bytes(), nil
}

func writeSinglePart(buf *bytes.Buffer, header func(k, v string), contentType, content string) error {
	header("Content-Type", contentType+"; charset=utf-8")
	header("Content-Transfer-Encoding", "quoted-printable")
	buf.WriteString("\r\n")
	qp := quotedprintable.NewWriter(buf)
	if _, err := qp.Write([]byte(content)); err != nil {
		return err
	}
	return qp.Close()
}

func writePart(mw *multipart.Writer, contentType, content string) error {
	part, err := mw.CreatePart(textproto.MIMEHeader{
		"Content-Type":              {contentType + "; charset=utf-8"},
		"Content-Transfer-Encoding": {"quoted-printable"},
	})
	if err != nil {
		return err
	}
	qp := quotedprintable.NewWriter(part)
	if _, err := qp.Write([]byte(content)); err != nil {
		return err
	}
	return qp.Close()
}
