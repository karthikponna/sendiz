// Oversized brand wordmark, cut off by the footer's glowing hairline (resend-auth-design).
export function Wordmark() {
  return (
    <div className="relative z-10 mx-auto max-w-[1200px] px-6 pt-24">
      <div className="h-[clamp(96px,17vw,228px)] select-none overflow-hidden" aria-hidden>
        <span className="block text-center text-[clamp(128px,24vw,320px)] font-semibold leading-[0.8] tracking-[-0.06em] text-cf-fg/[0.1]">
          Sendiz
        </span>
      </div>
    </div>
  )
}

export function FooterBar() {
  return (
    <footer className="relative overflow-hidden">
      <div className="relative h-px w-full bg-cf-border">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[min(70%,1100px)] -translate-x-1/2 -translate-y-1/2"
          style={{ background: 'radial-gradient(closest-side, rgb(240 227 222 / 0.12), transparent)' }}
        />
      </div>
      <div className="relative mx-auto flex max-w-[1200px] items-center justify-between px-6 py-8 text-sm text-cf-fg-muted">
        <span>
          © {new Date().getFullYear()} Sendiz by{' '}
          <a
            href="https://x.com/karthikponna19"
            target="_blank"
            rel="noreferrer"
            className="text-cf-fg transition-colors hover:text-cf-fg-strong"
          >
            karthikponna19
          </a>
        </span>
        <span>Email for developers</span>
      </div>
    </footer>
  )
}
