import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { LogoMark } from '@/components/logo'
import { useSession } from '@/hooks/use-session'
import { cn } from '@/lib/utils'

// Transparent header pinned over the page; like cloudflare.com, the wordmark collapses to
// the mark once content scrolls underneath it.
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)
  const { data: session, isPending } = useSession()
  const signedIn = Boolean(session)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const cta = signedIn ? 'Dashboard' : 'Get started'
  const ctaClass = 'rounded-full border px-3 py-1.5 text-sm font-medium'

  return (
    <>
      {/* Sits beside the pinned button but scrolls away with the page. The invisible copy of
          the button reserves exactly its width, whichever label it shows. */}
      <div className="absolute right-0 top-0 z-40 flex h-[72px] items-center gap-3 px-5">
        <a
          href="https://github.com/karthikponna/sendiz"
          target="_blank"
          rel="noreferrer"
          aria-label="Sendiz on GitHub"
          className="grid size-9 place-items-center rounded-full border border-cf-border text-cf-fg-muted transition-colors hover:border-cf-fg/30 hover:text-cf-fg-strong"
        >
          <GitHubIcon />
        </a>
        <span aria-hidden className={cn(ctaClass, 'invisible')}>
          {cta}
        </span>
      </div>

      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex h-[72px] items-center justify-between px-5">
        <Link to="/" aria-label="Sendiz home" className="pointer-events-auto flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <LogoMark />
          <span
            className={cn(
              'text-lg font-semibold tracking-[-0.02em] text-cf-fg-strong transition-all duration-200',
              scrolled && 'pointer-events-none -translate-x-1 opacity-0',
            )}
          >
            Sendiz
          </span>
        </Link>
        <Link
          to={signedIn ? '/onboarding' : '/signup'}
          className={cn(
            ctaClass,
            'pointer-events-auto border-cf-accent bg-cf-accent text-cf-fg-strong transition hover:brightness-110',
            isPending && 'invisible',
          )}
        >
          {cta}
        </Link>
      </header>
    </>
  )
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="currentColor" className="size-4">
      <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3" />
    </svg>
  )
}
