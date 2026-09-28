import { useState } from 'react'
import { Link } from 'react-router'
import { Check, Loader2, Lock, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CodeBlock } from '@/components/dashboard/code-block'
import { CreateApiKeyDialog } from '@/components/dashboard/create-api-key-dialog'
import { useApiKeys, useSendTestEmail } from '@/hooks/use-api'
import { useSession } from '@/hooks/use-session'
import { cn } from '@/lib/utils'

const API_URL = 'http://localhost:8080'
const FROM = 'Sendiz <onboarding@sendiz.dev>'
const HTML = '<p>Congrats on sending your <strong>first email</strong>!</p>'

function goSnippet(key: string, to: string) {
  return `package main

import (
	"context"
	"log"

	sendiz "github.com/karthikponna/sendiz/sdk/go"
)

func main() {
	client := sendiz.NewClient("${key}")

	_, err := client.Emails.Send(context.Background(), &sendiz.SendEmailRequest{
		From:    "${FROM}",
		To:      "${to}",
		Subject: "Hello World",
		HTML:    "${HTML}",
	})
	if err != nil {
		log.Fatal(err)
	}
}`
}

function curlSnippet(key: string, to: string) {
  return `curl -X POST '${API_URL}/email' \\
  -H 'Authorization: Bearer ${key}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "emails": [{
      "from": "${FROM}",
      "to": "${to}",
      "subject": "Hello World",
      "html": "${HTML}"
    }]
  }'`
}

function Step({ done, title, description, children, last }: {
  done: boolean
  title: string
  description: string
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <div className="relative flex gap-6">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            'mt-1 grid size-4 shrink-0 place-items-center rounded-full border-2',
            done ? 'border-cf-accent bg-cf-accent' : 'border-cf-fg/40 bg-cf-bg',
          )}
        >
          {done && <Check className="size-2.5 text-cf-fg-strong" strokeWidth={4} />}
        </span>
        {!last && <span className="w-px flex-1 border-l border-dashed border-cf-border" />}
      </div>
      <div className={cn('min-w-0 flex-1', !last && 'pb-14')}>
        <h2 className="text-lg font-medium tracking-[-0.3px] text-cf-fg-strong">{title}</h2>
        <p className="mt-1 text-sm text-cf-fg-muted">{description}</p>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  )
}

export function OnboardingPage() {
  const { data: session } = useSession()
  const { data: keys } = useApiKeys()
  const sendTest = useSendTestEmail()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const to = session?.user.email ?? 'you@example.com'
  const hasKey = Boolean(newKey) || (keys?.length ?? 0) > 0
  const key = newKey ?? (keys?.[0] ? `${keys[0].prefix}…` : 'sdz_xxxxxxxxx')

  async function onSend() {
    try {
      await sendTest.mutateAsync()
      setSent(true)
      toast.success('Email queued', { description: `On its way to ${to}. Check the Emails tab or Mailpit.` })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send email')
    }
  }

  return (
    <>
      <h1 className="text-[28px] font-medium tracking-[-0.72px] text-cf-fg-strong">Get started</h1>
      <p className="mt-2 text-sm text-cf-fg-muted">Send your first email with the Go SDK in two steps.</p>

      <div className="mt-12">
        <Step
          done={hasKey}
          title="Add an API key"
          description="Use the generated key to authenticate requests."
        >
          <Button
            onClick={() => setDialogOpen(true)}
            className="h-9 rounded-full bg-cf-cream px-4 text-cf-ink hover:bg-cf-cream/90"
          >
            <Lock /> Add API Key
          </Button>
          {newKey && (
            <p className="mt-3 text-xs text-cf-fg-muted">
              Your new key is filled into the snippet below. It won&apos;t be shown again.
            </p>
          )}
        </Step>

        <Step
          done={sent}
          last
          title="Send an email"
          description="Install the SDK, then run the code below to send your first email."
        >
          <div className="overflow-hidden rounded-xl border border-cf-border bg-cf-bg-raised">
            <Tabs defaultValue="go">
              <div className="flex items-center justify-between border-b border-cf-border px-3 py-2">
                <TabsList className="bg-transparent">
                  <TabsTrigger value="go">Go</TabsTrigger>
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                </TabsList>
                <code className="hidden font-mono text-xs text-cf-fg-muted md:block">
                  go get github.com/karthikponna/sendiz/sdk/go
                </code>
              </div>
              <TabsContent value="go">
                <CodeBlock code={goSnippet(key, to)} />
              </TabsContent>
              <TabsContent value="curl">
                <CodeBlock code={curlSnippet(key, to)} />
              </TabsContent>
            </Tabs>
            <div className="flex items-center gap-3 border-t border-cf-border px-4 py-3">
              <Button onClick={onSend} disabled={sendTest.isPending} variant="secondary" className="h-8 rounded-full px-3">
                {sendTest.isPending ? <Loader2 className="animate-spin" /> : <Send />}
                Send email
              </Button>
              {sent && (
                <Link to="/emails" className="text-sm text-cf-fg-muted underline-offset-4 hover:text-cf-fg-strong hover:underline">
                  View it in Emails
                </Link>
              )}
            </div>
          </div>
        </Step>
      </div>

      <CreateApiKeyDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={(k) => setNewKey(k.key)} />
    </>
  )
}
