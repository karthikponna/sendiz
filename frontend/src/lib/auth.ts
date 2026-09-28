import { createAuthClient } from '@neondatabase/neon-js/auth'

// The dev server proxies /neon-auth to NEON_AUTH_BASE_URL (see vite.config.ts), which keeps
// the auth cookies first-party.
export const authClient = createAuthClient(`${window.location.origin}/neon-auth`)

// Neon Auth puts a 15-minute JWT on the session; getSession() caches it until just
// before it expires, so calling it per request is cheap.
export async function getAccessToken(): Promise<string | null> {
  const { data } = await authClient.getSession()
  return data?.session?.token ?? null
}
