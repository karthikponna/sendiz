import { Fragment } from 'react'
import { CopyButton } from './copy-button'

// Just enough highlighting for the onboarding snippets: strings and a few keywords.
const tokenPattern =
  /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b(?:package|import|from|func|if|return|nil|const|await|new)\b)/g

function highlight(line: string) {
  return line.split(tokenPattern).map((part, i) => {
    if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>
    const isString = part.startsWith('"') || part.startsWith("'")
    return (
      <span key={i} className={isString ? 'text-[#ffd27a]' : 'text-[#ff9b73]'}>
        {part}
      </span>
    )
  })
}

export function CodeBlock({ code }: { code: string }) {
  const lines = code.split('\n')
  return (
    <div className="relative">
      <div className="absolute right-2 top-2">
        <CopyButton value={code} label="Copy code" />
      </div>
      <pre className="overflow-x-auto p-5 pr-12 font-mono text-[13px] leading-6 text-cf-fg-muted">
        {lines.map((line, i) => (
          <div key={i} className="flex">
            <span className="w-8 shrink-0 select-none pr-4 text-right text-cf-fg/25">{i + 1}</span>
            <code>{highlight(line)}</code>
          </div>
        ))}
      </pre>
    </div>
  )
}
