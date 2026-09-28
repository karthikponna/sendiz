import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Button type="button" variant="ghost" size="icon-sm" onClick={copy} aria-label={label}>
      {copied ? <Check className="text-emerald-400" /> : <Copy />}
    </Button>
  )
}
