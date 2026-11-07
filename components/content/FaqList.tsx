'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/components/providers/I18n'
import { useLive } from '@/components/providers/Live'
import { quickAnswers, type Answer } from '@/lib/answers'
import { getBackend } from '@/lib/backend'
import { IS_DEMO, DEMO_READY_KEY } from '@/lib/backend/config'
import { SITE, telLink, waLink } from '@/lib/site'
import { phoneDisplay } from '@/lib/format'

export function usePublishedFaqs() {
  const [rows, setRows] = useState<Answer[]>([])
  useEffect(() => {
    if (IS_DEMO) {
      try {
        if (localStorage.getItem(DEMO_READY_KEY) !== '1') return
      } catch {
        return
      }
    }
    getBackend()
      .then((b) => b.select<Answer & { is_published: boolean }>('faqs', 'id,topic,q_en,q_hi,a_en,a_hi,keywords,is_published', { order: ['sort', 'asc'] }))
      .then((r) => setRows(r.filter((x) => x.is_published)))
      .catch(() => {})
  }, [])
  return rows
}

export function FaqList() {
  const { t, lang, p, href } = useI18n()
  const { settings } = useLive()
  const quick = useMemo(() => quickAnswers(settings.fees, settings.pincodes), [settings.fees, settings.pincodes])
  const faqs = usePublishedFaqs()
  const [q, setQ] = useState('')
  const all = [...quick.map((a) => ({ ...a, quick: true })), ...faqs.map((a) => ({ ...a, quick: false }))]
  const n = q.trim().toLowerCase()
  const list = n ? all.filter((a) => [a.q_en, a.q_hi, a.a_en, a.a_hi, ...a.keywords].join(' ').toLowerCase().includes(n)) : all
  const topics = Array.from(new Set(list.map((a) => a.topic)))
  return (
    <div className="grid gap-12 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <label className="field lg:sticky lg:top-28">
          <span>{t.faq.search}</span>
          <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      <div className="lg:col-span-8">
        {list.length === 0 && <p className="text-muted">{t.faq.noMatch}</p>}
        {topics.map((topic) => (
          <section key={topic} className="mb-12" aria-labelledby={`t-${topic}`}>
            <h2 id={`t-${topic}`} className="display-s mb-4">
              {t.faq.topics[topic]}
            </h2>
            <div className="divide-y divide-line border-y border-line">
              {list
                .filter((a) => a.topic === topic)
                .map((a) => (
                  <details key={a.id} className="group py-1" open={!!n}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[1.1rem] font-semibold">
                      {p(a, 'q')}
                      <span className="text-2xl leading-none transition-transform group-open:rotate-45" aria-hidden>
                        +
                      </span>
                    </summary>
                    <p className="max-w-[62ch] pb-5 text-muted">{p(a, 'a')}</p>
                  </details>
                ))}
            </div>
          </section>
        ))}
        <div className="rounded-[1.75rem] bg-paper-2 p-6">
          <p className="font-semibold">{t.faq.stillNeed}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={telLink(SITE.phones.main)} className="btn btn-ink btn-sm">
              {t.common.call} {phoneDisplay(SITE.phones.main)}
            </a>
            <a href={waLink(SITE.phones.main)} target="_blank" rel="noopener" className="btn btn-ghost btn-sm">
              {t.common.whatsapp}
            </a>
            <Link href={href('/contact/')} className="btn btn-ghost btn-sm">
              {t.nav.contact}
            </Link>
          </div>
        </div>
        <p className="sr-only">{lang}</p>
      </div>
    </div>
  )
}
