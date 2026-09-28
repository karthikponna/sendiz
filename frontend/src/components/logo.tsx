import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-7', className)}>
      <rect width="32" height="32" rx="8" fill="var(--cf-accent)" />
      <path
        d="M10 10.5h12l-12 11h12"
        fill="none"
        stroke="var(--cf-fg-strong)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="text-lg font-semibold tracking-[-0.02em] text-cf-fg-strong">Sendiz</span>
    </span>
  )
}
