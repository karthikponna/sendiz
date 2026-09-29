// Shared by the Cloudflare Pages Functions in ../functions. It does in production what the
// Vite dev-server proxy does locally: serve the Go API and Neon Auth from this site's own
// origin, so auth cookies stay first-party (Safari and Brave block third-party cookies).
export async function proxy(request: Request, targetBase: string | undefined, prefix: string): Promise<Response> {
  if (!targetBase) {
    return new Response(`Proxy target for ${prefix} is not configured`, { status: 500 })
  }

  const url = new URL(request.url)
  const base = new URL(targetBase)
  const target = new URL(base.pathname.replace(/\/$/, '') + url.pathname.slice(prefix.length) + url.search, base.origin)

  const headers = new Headers(request.headers)
  headers.delete('host')

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    redirect: 'manual',
  })

  const out = new Headers(upstream.headers)
  const cookies = upstream.headers.getSetCookie()
  if (cookies.length > 0) {
    out.delete('set-cookie')
    for (const cookie of cookies) {
      // Cookies are scoped to the upstream host; dropping Domain re-scopes them to this site.
      out.append('set-cookie', cookie.replace(/;\s*domain=[^;]*/gi, ''))
    }
  }

  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out })
}
