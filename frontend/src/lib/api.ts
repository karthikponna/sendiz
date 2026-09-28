import { getAccessToken } from './auth'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type Options = { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown }

// Calls the Go API through the dev-server proxy at /api with the user's Neon Auth JWT.
export async function api<T>(path: string, { method = 'GET', body }: Options = {}): Promise<T> {
  const token = await getAccessToken()
  if (!token) throw new ApiError(401, 'Not signed in')

  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { message?: string } | null
    throw new ApiError(res.status, payload?.message ?? res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
