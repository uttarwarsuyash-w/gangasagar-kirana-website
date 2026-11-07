'use client'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Search as SearchIcon, ArrowUpRight } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { useI18n } from '@/components/providers/I18n'
import { buildIndex, search, type SearchDoc } from '@/lib/search'
import { inr } from '@/lib/format'
import { Picture } from '@/components/ui/Picture'
import { WhatsAppIcon } from '@/components/ui/Icons'
import { SITE, waLink } from '@/lib/site'

let docsPromise: Promise<SearchDoc[]> | null = null
export function loadSearchDocs() {
  docsPromise ??= fetch('/search-index.json').then((r) => r.json())
  return docsPromise
}

export function useSearchIndex(enabled = true) {
  const [docs, setDocs] = useState<SearchDoc[] | null>(null)
  useEffect(() => {
    if (enabled) loadSearchDocs().then(setDocs)
  }, [enabled])
  return useMemo(() => (docs ? buildIndex(docs) : null), [docs])
}

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang, f, href } = useI18n()
  const [q, setQ] = useState('')
  const index = useSearchIndex(open)
  const input = useRef<HTMLInputElement>(null)
  const results = useMemo(() => (index && q.trim() ? search(index, q, 12) : []), [index, q])
  const popular = lang === 'hi' ? ['मूंगफली', 'तूर दाल', 'चीनी', 'चिक्की', 'जीरा'] : ['peanuts', 'toor dal', 'sugar', 'chikki', 'jeera']

  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 50)
  }, [open])

  return (
    <Dialog open={open} onClose={onClose} title={t.search.title} variant="full" closeLabel={t.nav.close} className="!bg-paper">
      <div className="wrap h-full overflow-y-auto pb-16 pt-4">
        <form
          action={href('/search/')}
          onSubmit={(e) => {
            if (!q.trim()) e.preventDefault()
          }}
          className="relative"
        >
          <label htmlFor="site-search" className="sr-only">
            {t.search.label}
          </label>
          <SearchIcon className="pointer-events-none absolute left-0 top-1/2 h-7 w-7 -translate-y-1/2 text-muted sm:h-9 sm:w-9" />
          <input
            ref={input}
            id="site-search"
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.search.placeholder}
            autoComplete="off"
            className="w-full border-b-2 border-ink bg-transparent py-4 pl-10 font-display text-[clamp(1.6rem,5vw,3.5rem)] font-[600] tracking-[-0.02em] outline-none placeholder:text-ink/25 sm:pl-14"
          />
        </form>
        {!q.trim() && (
          <div className="mt-8">
            <p className="meta mb-3">{t.search.popular}</p>
            <div className="flex flex-wrap gap-2">
              {popular.map((x) => (
                <button key={x} className="chip" onClick={() => setQ(x)}>
                  {x}
                </button>
              ))}
            </div>
          </div>
        )}
        {q.trim() && index && (
          <div className="mt-6">
            <p className="meta mb-2" aria-live="polite">
              {results.length ? f(t.search.results, { n: results.length, q }) : f(t.search.noResults, { q })}
            </p>
            <ul className="divide-y divide-line">
              {results.map((d) => (
                <li key={d.id}>
                  <Link href={href(`/product/${d.id}/`)} onClick={onClose} className="group flex items-center gap-4 py-3">
                    <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-paper-2">
                      {d.img ? <Picture src={d.img} alt="" sizes="56px" /> : <span className="hand grid h-full place-items-center text-xl text-muted">{(lang === 'hi' ? d.hi : d.en).slice(0, 1)}</span>}
                    </span>
                    <span className="flex-1">
                      <span className="block font-display text-lg font-[600] leading-tight group-hover:text-brand">{lang === 'hi' ? d.hi : d.en}</span>
                      <span className="text-sm text-muted">{lang === 'hi' ? d.en : d.hi}</span>
                    </span>
                    {d.p != null && (
                      <span className="text-right text-[0.95rem] tnum">
                        {inr(d.p)}
                        {d.k && <span className="text-muted"> / {t.common.kg}</span>}
                      </span>
                    )}
                    <ArrowUpRight className="h-5 w-5 text-muted transition group-hover:text-brand" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            {!results.length && (
              <div className="mt-4">
                <p className="max-w-md text-muted">{t.search.noResultsBody}</p>
                <a href={waLink(SITE.phones.main, q)} className="btn btn-ink mt-4" target="_blank" rel="noopener">
                  <WhatsAppIcon className="h-5 w-5" /> {t.search.askStore}
                </a>
              </div>
            )}
            {results.length > 0 && (
              <Link href={`${href('/search/')}?q=${encodeURIComponent(q)}`} onClick={onClose} className="link-u mt-6 inline-block">
                {t.search.seeAllResults}
              </Link>
            )}
          </div>
        )}
      </div>
    </Dialog>
  )
}
