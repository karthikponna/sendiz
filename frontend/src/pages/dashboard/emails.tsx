import { useState } from 'react'
import { ChevronDown, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { useEmails } from '@/hooks/use-api'
import { formatDateTime, timeAgo } from '@/lib/time'
import type { Email, EmailStatus } from '@/lib/types'

const statuses: { value: EmailStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'sent', label: 'Sent' },
  { value: 'queued', label: 'Queued' },
  { value: 'sending', label: 'Sending' },
  { value: 'failed', label: 'Failed' },
]

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-3 py-2 text-sm">
      <span className="text-cf-fg-muted">{label}</span>
      <span className="min-w-0 break-words text-cf-fg-strong">{children}</span>
    </div>
  )
}

export function EmailsPage() {
  const [status, setStatus] = useState<EmailStatus | 'all'>('all')
  const [selected, setSelected] = useState<Email | null>(null)
  const query = useEmails(status === 'all' ? undefined : status)
  const emails = query.data?.pages.flatMap((p) => p.data) ?? []

  return (
    <>
      <h1 className="text-[28px] font-medium tracking-[-0.72px] text-cf-fg-strong">Emails</h1>

      <div className="mt-8 flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 min-w-40 justify-between">
              {statuses.find((s) => s.value === status)?.label}
              <ChevronDown className="text-cf-fg-muted" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuRadioGroup value={status} onValueChange={(v) => setStatus(v as EmailStatus | 'all')}>
              {statuses.map((s) => (
                <DropdownMenuRadioItem key={s.value} value={s.value}>
                  {s.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {query.isFetching && !query.isPending && <Loader2 className="size-4 animate-spin text-cf-fg-muted" />}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-cf-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-cf-bg-raised hover:bg-cf-bg-raised">
              <TableHead className="pl-4">To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="pr-4 text-right">Sent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isPending &&
              Array.from({ length: 4 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={4} className="px-4">
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!query.isPending && emails.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="py-16 text-center text-sm text-cf-fg-muted">
                  {query.isError ? query.error.message : 'No emails yet. Send one from Get started or the SDK.'}
                </TableCell>
              </TableRow>
            )}

            {emails.map((email) => (
              <TableRow key={email.id} className="cursor-pointer" onClick={() => setSelected(email)}>
                <TableCell className="pl-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center rounded-lg border border-cf-border bg-cf-bg-raised">
                      <Mail className="size-4 text-cf-fg-muted" />
                    </span>
                    <span className="truncate text-cf-fg-strong">{email.to}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={email.status} />
                </TableCell>
                <TableCell className="max-w-72 truncate text-cf-fg">{email.subject}</TableCell>
                <TableCell className="pr-4 text-right text-cf-fg-muted" title={formatDateTime(email.sent_at ?? email.created_at)}>
                  {timeAgo(email.sent_at ?? email.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {query.hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
            {query.isFetchingNextPage && <Loader2 className="animate-spin" />}
            Load more
          </Button>
        </div>
      )}

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="bg-cf-bg-raised sm:max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8">{selected.subject || '(no subject)'}</DialogTitle>
                <DialogDescription className="font-mono text-xs">{selected.id}</DialogDescription>
              </DialogHeader>
              <div className="divide-y divide-cf-border">
                <Detail label="Status"><StatusBadge status={selected.status} /></Detail>
                <Detail label="From">{selected.from}</Detail>
                <Detail label="To">{selected.to}</Detail>
                <Detail label="Attempts">{selected.attempts}</Detail>
                <Detail label="Created">{formatDateTime(selected.created_at)}</Detail>
                {selected.sent_at && <Detail label="Sent">{formatDateTime(selected.sent_at)}</Detail>}
                {selected.last_error && (
                  <Detail label="Last error">
                    <span className="font-mono text-xs text-red-300">{selected.last_error}</span>
                  </Detail>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
