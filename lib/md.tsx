// Tiny, safe Markdown subset for policies and blog posts: ## headings, ### subheadings,
// paragraphs, - lists, 1. lists, **bold** and [links](url). No raw HTML.
import { Fragment } from 'react'

function inline(s: string, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const re = /\*\*(.+?)\*\*|\[(.+?)\]\(((?:https?:\/\/|\/|mailto:|tel:)[^\s)]+)\)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index))
    if (m[1]) out.push(<strong key={`${key}-${i++}`}>{m[1]}</strong>)
    else out.push(<a key={`${key}-${i++}`} href={m[3]} {...(m[3].startsWith('http') ? { target: '_blank', rel: 'noopener' } : {})}>{m[2]}</a>)
    last = re.lastIndex
  }
  if (last < s.length) out.push(s.slice(last))
  return out
}

export function Markdown({ text, className = 'prose-gs' }: { text: string; className?: string }) {
  const blocks = text.replace(/\r/g, '').split(/\n{2,}/)
  return (
    <div className={className}>
      {blocks.map((b, i) => {
        const t = b.trim()
        if (!t) return null
        if (t.startsWith('### ')) return <h3 key={i}>{inline(t.slice(4), `h${i}`)}</h3>
        if (t.startsWith('## ')) return <h2 key={i}>{inline(t.slice(3), `h${i}`)}</h2>
        const lines = t.split('\n')
        if (lines.every((l) => /^- /.test(l))) return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.slice(2), `l${i}${j}`)}</li>)}</ul>
        if (lines.every((l) => /^\d+\. /.test(l))) return <ol key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\d+\. /, ''), `o${i}${j}`)}</li>)}</ol>
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l, `p${i}${j}`)}
              </Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}
