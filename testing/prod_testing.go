//go:build ignore

// The dashboard's Go SDK snippet, run against production (https://api.sendiz.dev).
// It lives next to main.go with its own main, so it's excluded from normal builds and
// runs on its own:
//
//	SENDIZ_API_KEY=sdz_... go run prod_testing.go -to you@gmail.com
//
// On the free plan "to" must be your own login email, and you can send 5 emails a day.
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	sendiz "github.com/karthikponna/sendiz/sdk/go"
)

func main() {
	to := flag.String("to", "", "your Sendiz login email (the only allowed recipient)")
	flag.Parse()

	apiKey := os.Getenv("SENDIZ_API_KEY")
	if apiKey == "" || *to == "" {
		log.Fatal("usage: SENDIZ_API_KEY=sdz_... go run prod_testing.go -to you@gmail.com")
	}

	client := sendiz.NewClient(apiKey)

	// Long enough for the worker's retries (RETRY_AFTER apart) to end in sent or failed.
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()

	resp, err := client.Emails.Send(ctx, &sendiz.SendEmailRequest{
		From:    "Sendiz <onboarding@sendiz.dev>",
		To:      *to,
		Subject: "Hello World",
		HTML:    "<p>Congrats on sending your <strong>first email</strong>!</p>",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("queued:", resp.ID)

	// Not part of the dashboard snippet: wait so you can see the email actually go out.
	lastErr := ""
	for {
		email, err := client.Emails.Get(ctx, resp.ID)
		if err != nil {
			log.Fatal(err)
		}
		switch email.Status {
		case sendiz.StatusSent:
			fmt.Println("sent, check your inbox (and spam folder)")
			return
		case sendiz.StatusFailed:
			log.Fatalf("failed: %s", email.LastError)
		}
		if email.LastError != "" && email.LastError != lastErr {
			lastErr = email.LastError
			fmt.Println("retrying after error:", lastErr)
		}
		time.Sleep(time.Second)
	}
}
