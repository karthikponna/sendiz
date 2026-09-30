import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useUsage } from '@/hooks/use-api'
import { useSession } from '@/hooks/use-session'
import { cn } from '@/lib/utils'

export function UsagePage() {
  const { data: session } = useSession()
  const { data: usage, isPending, isError, error } = useUsage()

  const limited = Boolean(usage && usage.limit > 0)
  const percent = usage && limited ? Math.min(100, (usage.used / usage.limit) * 100) : 0
  const left = usage ? Math.max(0, usage.limit - usage.used) : 0
  const reached = limited && left === 0

  // Start the bar empty so it fills in on load instead of appearing already full.
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(percent))
    return () => cancelAnimationFrame(frame)
  }, [percent])

  return (
    <>
      <h1 className="text-[28px] font-medium tracking-[-0.72px] text-cf-fg-strong">Usage</h1>
      <p className="mt-2 text-sm text-cf-fg-muted">
        The free plan sends up to {usage?.limit || 10} emails a day, only to your own address
        {session?.user.email ? ` (${session.user.email})` : ''}.
      </p>

      <div className="mt-8 rounded-xl border border-cf-border bg-cf-bg-raised p-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-cf-fg-muted">Emails sent today</span>
          {usage && (
            <span className="text-cf-fg-muted">
              Resets at {new Date(usage.resets_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
        </div>

        {isPending && (
          <div className="mt-4 space-y-4">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-2 w-full" />
          </div>
        )}

        {isError && <p className="mt-4 text-sm text-cf-fg-muted">{error.message}</p>}

        {usage && (
          <>
            <p className="mt-3 text-4xl font-medium tracking-[-1px] text-cf-fg-strong tabular-nums">
              {usage.used}
              {limited && <span className="text-cf-fg-muted"> / {usage.limit}</span>}
            </p>

            {limited ? (
              <>
                <Progress
                  value={shown}
                  aria-label="Emails used today"
                  className={cn(
                    'mt-5 h-2 bg-cf-fg/10 [&_[data-slot=progress-indicator]]:duration-700 [&_[data-slot=progress-indicator]]:ease-out',
                    reached && '[&_[data-slot=progress-indicator]]:bg-amber-300',
                  )}
                />
                <p className={cn('mt-3 text-sm', reached ? 'text-amber-300' : 'text-cf-fg-muted')}>
                  {reached
                    ? 'Daily limit reached. You can send again after the reset.'
                    : `${left} ${left === 1 ? 'email' : 'emails'} left today`}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-cf-fg-muted">No daily limit</p>
            )}
          </>
        )}
      </div>
    </>
  )
}
