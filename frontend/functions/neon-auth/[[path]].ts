import { proxy } from '../../cloudflare/proxy'

interface Env {
  NEON_AUTH_BASE_URL: string
}

// /neon-auth/* → Neon Auth (NEON_AUTH_BASE_URL).
export const onRequest = ({ request, env }: { request: Request; env: Env }) =>
  proxy(request, env.NEON_AUTH_BASE_URL, '/neon-auth')
