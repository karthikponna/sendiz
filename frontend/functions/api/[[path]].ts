import { proxy } from '../../cloudflare/proxy'

interface Env {
  API_URL: string
}

// /api/* → the Go API (API_URL, e.g. https://api.sendiz.dev).
export const onRequest = ({ request, env }: { request: Request; env: Env }) =>
  proxy(request, env.API_URL, '/api')
