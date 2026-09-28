import { useState } from 'react'
import { KeyRound, Loader2, TriangleAlert } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateApiKey } from '@/hooks/use-api'
import type { CreatedApiKey } from '@/lib/types'
import { CopyButton } from './copy-button'

export function CreateApiKeyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (key: CreatedApiKey) => void
}) {
  const [name, setName] = useState('')
  const [created, setCreated] = useState<CreatedApiKey | null>(null)
  const createKey = useCreateApiKey()

  function close(next: boolean) {
    onOpenChange(next)
    if (!next) {
      setCreated(null)
      setName('')
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const key = await createKey.mutateAsync(name.trim())
      setCreated(key)
      onCreated?.(key)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create API key')
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="border border-cf-border bg-cf-bg-raised sm:max-w-md">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>View API key</DialogTitle>
              <DialogDescription>Copy it now and keep it somewhere safe.</DialogDescription>
            </DialogHeader>
            <div className="flex min-w-0 items-center gap-2 rounded-lg border border-cf-border bg-cf-bg py-1.5 pl-3 pr-1.5">
              <KeyRound className="size-4 shrink-0 text-cf-accent" />
              <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-cf-fg-strong" title={created.key}>
                {created.key}
              </code>
              <CopyButton value={created.key} label="Copy API key" />
            </div>
            <p className="flex items-start gap-2 text-xs text-amber-300/90">
              <TriangleAlert className="mt-px size-3.5 shrink-0" />
              You won&apos;t be able to see this key again. Only its hash is stored.
            </p>
            <DialogFooter>
              <Button autoFocus onClick={() => close(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Add API key</DialogTitle>
              <DialogDescription>Keys authenticate the Go SDK and REST requests.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                placeholder="Name"
                value={name}
                maxLength={50}
                autoFocus
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || createKey.isPending}>
                {createKey.isPending && <Loader2 className="animate-spin" />}
                Add
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
