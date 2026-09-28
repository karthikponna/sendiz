import { cn } from '@/lib/utils'

// Page shell with full-height dashed rails at both edges (cloudflare-hero-design). The
// landing page turns them off so they don't run beside the hero image; DottedFrame draws
// its own below it.
export function PageRails({ children, rails = true }: { children: React.ReactNode; rails?: boolean }) {
  return (
    <div className="relative min-h-svh overflow-x-clip bg-cf-bg text-cf-fg">
      {rails && (
        <>
          <div aria-hidden className="cf-rail pointer-events-none absolute inset-y-0 left-2 z-20" />
          <div aria-hidden className="cf-rail pointer-events-none absolute inset-y-0 right-2 z-20" />
        </>
      )}
      {children}
    </div>
  )
}

// The region under the hero: a dashed line on top, dashed lines on the edges of the
// 1200px content column, and a dot grid in the gutters outside it (cloudflare.com).
export function DottedFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate mt-2">
      <div aria-hidden className="cf-rail-x pointer-events-none absolute inset-x-2 top-0" />
      <div aria-hidden className="cf-rail pointer-events-none absolute inset-y-0 left-2" />
      <div aria-hidden className="cf-rail pointer-events-none absolute inset-y-0 right-2" />
      <div aria-hidden className="pointer-events-none absolute inset-x-2 inset-y-0 -z-10 hidden md:block">
        <div className="cf-grid-dots absolute inset-0" />
        <div className="absolute inset-y-0 left-4 right-4">
          <div className="relative mx-auto h-full max-w-[1200px] bg-cf-bg">
            <div className="cf-rail absolute inset-y-0 left-0" />
            <div className="cf-rail absolute inset-y-0 right-0" />
          </div>
        </div>
      </div>
      {children}
    </div>
  )
}

function Corner({ className }: { className: string }) {
  return (
    <div
      aria-hidden
      className={cn('absolute size-3.5 rounded-[3px] border border-cf-border bg-cf-bg-raised', className)}
    />
  )
}

// A bordered box with a 14px square on each corner.
export function CornerFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('relative border border-cf-border', className)}>
      <Corner className="-left-[7px] -top-[7px]" />
      <Corner className="-right-[7px] -top-[7px]" />
      <Corner className="-bottom-[7px] -left-[7px]" />
      <Corner className="-bottom-[7px] -right-[7px]" />
      {children}
    </div>
  )
}
