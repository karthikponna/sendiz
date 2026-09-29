export type EmailStatus = 'queued' | 'sending' | 'sent' | 'failed'

export interface Email {
  id: string
  from: string
  to: string
  subject: string
  status: EmailStatus
  attempts: number
  last_error?: string
  sent_at?: string
  created_at: string
  updated_at: string
}

export interface ApiKey {
  id: string
  name: string
  prefix: string
  last_used_at: string | null
  created_at: string
}

export interface CreatedApiKey extends ApiKey {
  key: string
}

export interface Usage {
  used: number
  // 0 means no daily limit
  limit: number
  resets_at: string
}

export interface Page<T> {
  data: T[]
  next_cursor: string | null
}
