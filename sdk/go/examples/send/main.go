// Sends one email with the Sendiz Go SDK and waits until it is sent or fails.
//
//	SENDIZ_API_KEY=sdz_... go run ./examples/send you@example.com
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	sendiz "github.com/karthikponna/sendiz/sdk/go"
)

func main() {
	apiKey := os.Getenv("SENDIZ_API_KEY")
	if apiKey == "" {
		log.Fatal("set SENDIZ_API_KEY to a key from the Sendiz dashboard")
	}
	to := "delivered@example.com"
	if len(os.Args) > 1 {
		to = os.Args[1]
	}

	opts := []sendiz.Option{}
	if baseURL := os.Getenv("SENDIZ_BASE_URL"); baseURL != "" {
		opts = append(opts, sendiz.WithBaseURL(baseURL))
	}
	client := sendiz.NewClient(apiKey, opts...)

	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	resp, err := client.Emails.Send(ctx, &sendiz.SendEmailRequest{
		From:    "Sendiz <onboarding@sendiz.dev>",
		To:      to,
		Subject: "Hello World",
		HTML:    "<p>Congrats on sending your <strong>first email</strong>!</p>",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("queued:", resp.ID)

	for {
		email, err := client.Emails.Get(ctx, resp.ID)
		if err != nil {
			log.Fatal(err)
		}
		switch email.Status {
		case sendiz.StatusSent:
			fmt.Println("sent after", email.Attempts, "attempt(s)")
			return
		case sendiz.StatusFailed:
			log.Fatalf("failed: %s", email.LastError)
		}
		time.Sleep(time.Second)
	}
}
