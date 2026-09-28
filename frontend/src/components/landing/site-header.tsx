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

  return (
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
          'pointer-events-auto rounded-full border border-cf-accent bg-cf-accent px-3 py-1.5 text-sm font-medium text-cf-fg-strong transition hover:brightness-110',
          isPending && 'invisible',
        )}
      >
        {signedIn ? 'Dashboard' : 'Get started'}
      </Link>
    </header>
  )
}
