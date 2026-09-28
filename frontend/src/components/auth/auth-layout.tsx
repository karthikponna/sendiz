import { Link } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import { LogoMark } from '@/components/logo'
import { PageRails } from '@/components/landing/frame'

// Layout from resend-auth-design; background from cloudflare-hero-design.
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <PageRails>
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="cf-dots absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_70%)]" />
        <div className="absolute -right-40 -top-40 size-[640px] rounded-full bg-cf-accent/20 blur-[140px]" />
        <div className="absolute -bottom-56 -left-40 size-[560px] rounded-full bg-[#ffd27a]/10 blur-[140px]" />
      </div>

      <Link
        to="/"
        className="absolute left-6 top-6 z-30 inline-flex h-10 items-center gap-1 rounded-2xl px-4 text-sm font-semibold text-cf-fg-muted transition-colors hover:text-cf-fg-strong"
      >
        <ChevronLeft className="size-4" /> Home
      </Link>

      <div className="relative z-10 flex min-h-dvh items-center justify-center px-4">
        <main className="w-full max-w-lg py-16">
          <div className="flex flex-col items-center text-center">
            <div className="grid size-12 place-items-center rounded-xl border border-cf-border bg-cf-bg-raised">
              <LogoMark className="size-8" />
            </div>
            <h1 className="mt-6 text-balance text-[28px] font-medium leading-[34px] tracking-[-0.72px] text-cf-fg-strong">
              {title}
            </h1>
            <p className="mt-3 text-sm text-cf-fg-muted">{subtitle}</p>
          </div>
          <div className="mt-8">{children}</div>
        </main>
      </div>
    </PageRails>
  )
}
