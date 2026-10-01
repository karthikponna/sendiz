/**
 * TypeScript client for the Sendiz email API.
 *
 * ```ts
 * const sendiz = new Sendiz('sdz_...')
 * const { id } = await sendiz.emails.send({
 *   from: 'Acme <onboarding@sendiz.dev>',
 *   to: 'user@example.com',
 *   subject: 'Hello World',
 *   html: '<strong>It works!</strong>',
 * })
 * ```
 */

export const VERSION = '0.1.0'
export const DEFAULT_BASE_URL = 'https://api.sendiz.dev'
/** The most emails the API accepts in one request. */
export const MAX_BATCH_SIZE = 100

export type EmailStatus = 'queued' | 'sending' | 'sent' | 'failed'

export interface SendEmailRequest {
  from: string
  to: string
  subject: string
  html?: string
  text?: string
}

export interface SendEmailResponse {
  id: string
}

export interface Email {
  id: string
  from: string
  to: string
  subject: string
  html?: string
  text?: string
  status: EmailStatus
  attempts: number
  last_error?: string
  sent_at?: string | null
  created_at: string
  updated_at: string
}

export interface SendizOptions {
  /** Defaults to https://api.sendiz.dev. */
  baseUrl?: string
  /** Request timeout in milliseconds. Defaults to 30s. */
  timeout?: number
  /** Custom fetch, for example in tests. Defaults to the global fetch. */
  fetch?: typeof fetch
}

/** Thrown for any non-2xx response from the API. */
export class SendizError extends Error {
  readonly statusCode: number

  constructor(statusCode: number, message: string) {
    super(`sendiz: ${statusCode} ${message}`)
    this.name = 'SendizError'
    this.statusCode = statusCode
  }
}

export class Sendiz {
  readonly emails: Emails
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly timeout: number
  private readonly fetch: typeof fetch

  constructor(apiKey: string, options: SendizOptions = {}) {
    if (!apiKey) throw new Error('sendiz: apiKey is required')
    this.apiKey = apiKey
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '')
    this.timeout = options.timeout ?? 30_000
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.emails = new Emails(this)
  }

  /** @internal */
  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
      'User-Agent': `sendiz-typescript/${VERSION}`,
    }
    if (body !== undefined) headers['Content-Type'] = 'application/json'

    const res = await this.fetch(this.baseUrl + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeout),
    })

    if (!res.ok) {
      let message = res.statusText || 'Request failed'
      try {
        const payload = (await res.json()) as { message?: string }
        if (payload.message) message = payload.message
      } catch {
        // Not JSON; keep the status text.
      }
      throw new SendizError(res.status, message)
    }
    return (await res.json()) as T
  }
}

export class Emails {
  constructor(private readonly client: Sendiz) {}

  /** Queues one email. Resolves as soon as it is queued; use get() to follow its status. */
  async send(email: SendEmailRequest): Promise<SendEmailResponse> {
    const [resp] = await this.sendBatch([email])
    return resp
  }

  /** Queues up to MAX_BATCH_SIZE emails in one request. IDs come back in the same order. */
  async sendBatch(emails: SendEmailRequest[]): Promise<SendEmailResponse[]> {
    if (emails.length < 1 || emails.length > MAX_BATCH_SIZE) {
      throw new Error(`sendiz: batch must contain 1 to ${MAX_BATCH_SIZE} emails, got ${emails.length}`)
    }
    const resp = await this.client.request<{ data: SendEmailResponse[] }>('POST', '/email', { emails })
    return resp.data
  }

  /** Returns an email and its current delivery status. */
  get(id: string): Promise<Email> {
    return this.client.request<Email>('GET', `/email/${encodeURIComponent(id)}`)
  }
}

export default Sendiz
