import { useState } from 'react'
import { KeyRound, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CreateApiKeyDialog } from '@/components/dashboard/create-api-key-dialog'
import { useApiKeys, useRevokeApiKey } from '@/hooks/use-api'
import { formatDateTime, timeAgo } from '@/lib/time'
import type { ApiKey } from '@/lib/types'

export function ApiKeysPage() {
  const { data: keys, isPending, isError, error } = useApiKeys()
  const revoke = useRevokeApiKey()
  const [createOpen, setCreateOpen] = useState(false)
  const [toRevoke, setToRevoke] = useState<ApiKey | null>(null)

  async function confirmRevoke() {
    if (!toRevoke) return
    try {
      await revoke.mutateAsync(toRevoke.id)
      toast.success(`Revoked "${toRevoke.name}"`)
      setToRevoke(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke key')
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-medium tracking-[-0.72px] text-cf-fg-strong">API keys</h1>
        <Button onClick={() => setCreateOpen(true)} className="h-9 rounded-full px-4">
          <Plus /> Create API key
        </Button>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-cf-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-cf-bg-raised hover:bg-cf-bg-raised">
              <TableHead className="pl-4">Name</TableHead>
              <TableHead>Token</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-12 pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && (
              <TableRow>
                <TableCell colSpan={5} className="px-4">
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            )}

            {!isPending && (keys?.length ?? 0) === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-16 text-center text-sm text-cf-fg-muted">
                  {isError ? error.message : 'No API keys yet. Create one to use the Go SDK.'}
                </TableCell>
              </TableRow>
            )}

            {keys?.map((key) => (
              <TableRow key={key.id}>
                <TableCell className="pl-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center rounded-lg border border-cf-border bg-cf-bg-raised">
                      <KeyRound className="size-4 text-cf-fg-muted" />
                    </span>
                    <span className="text-cf-fg-strong">{key.name}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-cf-fg">{key.prefix}…</TableCell>
                <TableCell className="text-cf-fg-muted">{key.last_used_at ? timeAgo(key.last_used_at) : 'Never'}</TableCell>
                <TableCell className="text-cf-fg-muted" title={formatDateTime(key.created_at)}>
                  {timeAgo(key.created_at)}
                </TableCell>
                <TableCell className="pr-4 text-right">
                  <Button variant="ghost" size="icon-sm" aria-label={`Revoke ${key.name}`} onClick={() => setToRevoke(key)}>
                    <Trash2 className="text-cf-fg-muted" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CreateApiKeyDialog open={createOpen} onOpenChange={setCreateOpen} />

      <Dialog open={toRevoke !== null} onOpenChange={(open) => !open && setToRevoke(null)}>
        <DialogContent className="bg-cf-bg-raised sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke API key</DialogTitle>
            <DialogDescription>
              Requests using <span className="font-mono">{toRevoke?.prefix}…</span> will start failing. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setToRevoke(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRevoke} disabled={revoke.isPending}>
              {revoke.isPending && <Loader2 className="animate-spin" />}
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
