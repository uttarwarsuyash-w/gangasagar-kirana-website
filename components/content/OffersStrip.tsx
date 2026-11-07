'use client'
import { useEffect, useState } from 'react'
import { useI18n } from '@/components/providers/I18n'
import { getBackend } from '@/lib/backend'
import { IS_DEMO, DEMO_READY_KEY } from '@/lib/backend/config'
import { Picture } from '@/components/ui/Picture'
import { dateShort } from '@/lib/format'
import { InstagramIcon } from '@/components/ui/Icons'
import { SITE } from '@/lib/site'

export interface Offer {
  id: string
  kind: 'festival' | 'combo' | 'bulk' | 'general'
  title_en: string
  title_hi: string
  body_en: string | null
  body_hi: string | null
  image_url: string | null
  link_url: string | null
  ends_at: string | null
}

export function useOffers(enabled = true) {
  const [offers, setOffers] = useState<Offer[] | null>(null)
  useEffect(() => {
    if (!enabled) return
    let ok = true
    // In demo mode, only read offers once the demo database exists (avoid loading it on every visit).
    if (IS_DEMO) {
      let ready = false
      try {
        ready = localStorage.getItem(DEMO_READY_KEY) === '1'
      } catch {}
      if (!ready) return setOffers([])
    }
    getBackend()
      .then((b) => b.select<Offer>('offers', 'id,kind,title_en,title_hi,body_en,body_hi,image_url,link_url,ends_at,is_published,starts_at', { order: ['sort', 'asc'] }))
      .then((rows) => ok && setOffers(rows.filter((r) => (r as unknown as { is_published: boolean }).is_published)))
      .catch(() => ok && setOffers([]))
    return () => {
      ok = false
    }
  }, [enabled])
  return offers
}

export function OffersStrip({ limit, className = '' }: { limit?: number; className?: string }) {
  const { t, lang, p, f } = useI18n()
  const offers = useOffers()
  if (offers == null)
    return (
      <div className={`grid gap-4 md:grid-cols-3 ${className}`}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton aspect-[4/3]" />
        ))}
      </div>
    )
  const list = limit ? offers.slice(0, limit) : offers
  if (!list.length)
    return (
      <div className={`flex flex-col items-start gap-4 rounded-[1.75rem] border-2 border-dashed border-line p-8 md:flex-row md:items-center md:justify-between ${className}`}>
        <div>
          <p className="display-s">{t.offers.empty}</p>
          <p className="mt-2 max-w-[52ch] text-muted">{t.offers.emptyBody}</p>
        </div>
        <a href={SITE.instagram} target="_blank" rel="noopener" className="btn btn-ink shrink-0">
          <InstagramIcon className="h-5 w-5" /> Instagram
        </a>
      </div>
    )
  return (
    <div className={`grid gap-5 md:grid-cols-3 ${className}`}>
      {list.map((o, i) => (
        <article key={o.id} className="overflow-hidden rounded-[1.6rem] bg-paper-2" style={{ transform: `rotate(${[-1.5, 1, -0.5][i % 3]}deg)` }}>
          {o.image_url && (
            <div className="aspect-[16/10]">
              <Picture src={o.image_url} alt="" sizes="(min-width: 768px) 30vw, 90vw" />
            </div>
          )}
          <div className="p-6">
            <p className="text-[0.8rem] font-semibold text-brand">{t.offers.kinds[o.kind]}</p>
            <h3 className="display-s mt-2">{p(o, 'title')}</h3>
            {p(o, 'body') && <p className="mt-3 text-muted">{p(o, 'body')}</p>}
            {o.ends_at && <p className="hand mt-4 text-[1.05rem]">{f(t.offers.until, { date: dateShort(o.ends_at, lang) })}</p>}
            {o.link_url && (
              <a href={o.link_url} className="btn btn-ink btn-sm mt-4">
                {t.common.shopNow}
              </a>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}
