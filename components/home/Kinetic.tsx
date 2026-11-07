'use client'
import { useEffect, useRef, useState } from 'react'

function graphemes(s: string) {
  try {
    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    return Array.from(seg.segment(s), (x) => x.segment)
  } catch {
    return Array.from(s)
  }
}

/**
 * Headline that swaps letter by letter: the old text drops out, the new text rises in.
 * Latin text animates per letter; Devanagari per word (keeps conjuncts and matras intact).
 */
export function Kinetic({ text, className = '', as: Tag = 'span', perWord, delay = 0 }: { text: string; className?: string; as?: 'span' | 'h1' | 'p'; perWord?: boolean; delay?: number }) {
  const [shown, setShown] = useState(text)
  const [prev, setPrev] = useState<string | null>(null)
  const first = useRef(true)
  useEffect(() => {
    if (text === shown) return
    setPrev(shown)
    setShown(text)
    first.current = false
    const t = setTimeout(() => setPrev(null), 700)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  // Words stay unbreakable; Latin words animate per letter, Devanagari per word (keeps conjuncts intact).
  const render = (s: string, mode: 'in' | 'out') => {
    let n = 0
    const step = mode === 'in' ? 26 : 14
    const deva = perWord || /[\u0900-\u097F]/.test(s)
    return s.split(/(\s+)/).map((word, wi) => {
      if (/^\s+$/.test(word)) return <span key={wi}> </span>
      const parts = deva ? [word] : graphemes(word)
      return (
        <span key={wi} className="inline-block whitespace-nowrap">
          {parts.map((ch, i) => (
            <span key={i} className="kin-clip">
              <span className={`kin-${mode}`} style={{ animationDelay: `${delay + n++ * step}ms` }}>
                {ch}
              </span>
            </span>
          ))}
        </span>
      )
    })
  }

  return (
    <Tag className={`relative block ${className}`} aria-label={shown}>
      <span aria-hidden className="block">
        {render(shown, 'in')}
      </span>
      {prev && (
        <span aria-hidden className="pointer-events-none absolute inset-0 block">
          {render(prev, 'out')}
        </span>
      )}
    </Tag>
  )
}
