'use client'
// Rule-based help pop-up: answers from the store's settings, published FAQs and the customer's own
// orders. Not an AI model; anything it cannot match goes to a phone call or WhatsApp.
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircleQuestion, X, Send } from 'lucide-react'
import { useI18n } from '@/components/providers/I18n'
import { useLive } from '@/components/providers/Live'
import { useSession } from '@/components/providers/Session'
import { quickAnswers, matchAnswer } from '@/lib/answers'
import { usePublishedFaqs } from './FaqList'
import { getBackend } from '@/lib/backend'
import { SITE, telLink, waLink } from '@/lib/site'
import { WhatsAppIcon } from '@/components/ui/Icons'

interface Msg {
  from: 'me' | 'bot'
  text: string
  fallback?: boolean
  link?: { href: string; label: string }
}

const ORDER_WORDS = /\b(track|my order|order status|where is my|status)\b|ऑर्डर|ट्रैक|स्थिति/i

export function HelpWidget() {
  const { t, lang, p, f, href } = useI18n()
  const { settings } = useLive()
  const { user, signIn } = useSession()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [q, setQ] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const faqs = usePublishedFaqs()
  const answers = useMemo(() => [...quickAnswers(settings.fees, settings.pincodes), ...faqs], [settings.fees, settings.pincodes, faqs])

  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [msgs])
  useEffect(() => setOpen(false), [pathname])

  async function ask(text: string) {
    const question = text.trim()
    if (!question) return
    setQ('')
    const next: Msg[] = [...msgs, { from: 'me', text: question }]
    setMsgs(next)
    const a = matchAnswer(question, answers)
    if (a?.id === 'track' || (!a && ORDER_WORDS.test(question))) {
      if (!user) return setMsgs([...next, { from: 'bot', text: t.help.signInForOrders }])
      try {
        const b = await getBackend()
        const orders = await b.rpc<{ id: string; number: string; status: string }[]>('my_orders')
        if (!orders.length) return setMsgs([...next, { from: 'bot', text: t.help.noOrders }])
        const o = orders[0]
        return setMsgs([
          ...next,
          {
            from: 'bot',
            text: f(t.help.latestOrder, { number: o.number, status: t.order.statuses[o.status as keyof typeof t.order.statuses] ?? o.status }),
            link: { href: `${href('/account/order/')}?id=${o.id}`, label: t.order.track },
          },
        ])
      } catch {
        /* fall through to rules */
      }
    }
    setMsgs([...next, a ? { from: 'bot', text: p(a, 'a') } : { from: 'bot', text: t.help.noAnswer, fallback: true }])
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="help-panel"
        className="fixed bottom-4 right-4 z-[70] flex h-14 items-center gap-2 rounded-full bg-ink pl-4 pr-5 text-paper shadow-[0_14px_34px_-12px_rgb(31_26_23/0.6)] transition hover:bg-brand sm:bottom-6 sm:right-6"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircleQuestion className="h-5 w-5" />}
        <span className="font-semibold">{t.help.open}</span>
      </button>
      {open && (
        <section
          id="help-panel"
          role="dialog"
          aria-label={t.help.title}
          className="fixed inset-x-3 bottom-20 z-[70] flex max-h-[70vh] flex-col overflow-hidden rounded-[1.6rem] bg-paper shadow-[0_30px_80px_-20px_rgb(31_26_23/0.55)] ring-1 ring-line sm:inset-x-auto sm:bottom-24 sm:right-6 sm:w-[24rem]"
          style={{ animation: 'dialog-in .3s var(--ease-out-expo)' }}
        >
          <header className="on-ink px-5 py-4">
            <p className="font-display text-xl font-[650]">{t.help.title}</p>
            <p className="text-[0.8rem] text-paper/60">{t.help.disclaimer}</p>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {msgs.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {t.help.suggestions.map((s) => (
                  <button key={s} className="chip !min-h-9 text-[0.9rem]" onClick={() => ask(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : ''}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[0.95rem] ${m.from === 'me' ? 'bg-ink text-paper' : 'bg-paper-2'}`}>
                  <p>{m.text}</p>
                  {m.link && (
                    <a href={m.link.href} className="link-u mt-1 inline-block font-semibold">
                      {m.link.label}
                    </a>
                  )}
                  {m.text === t.help.signInForOrders && (
                    <button className="btn btn-ink btn-sm mt-2" onClick={() => signIn()}>
                      {t.nav.signIn}
                    </button>
                  )}
                  {m.fallback && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <a href={telLink(SITE.phones.main)} className="btn btn-ink btn-sm">
                        {t.common.call}
                      </a>
                      <a href={waLink(SITE.phones.main, msgs[i - 1]?.text)} target="_blank" rel="noopener" className="btn btn-ghost btn-sm">
                        <WhatsAppIcon className="h-4 w-4" /> {t.common.whatsapp}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={end} />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              ask(q)
            }}
            className="flex gap-2 border-t border-line p-3"
          >
            <label className="sr-only" htmlFor="help-q">
              {t.help.placeholder}
            </label>
            <input id="help-q" className="input !min-h-11 flex-1 !rounded-full" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.help.placeholder} lang={lang} autoComplete="off" />
            <button className="grid h-11 w-11 place-items-center rounded-full bg-brand text-white" aria-label={t.help.send}>
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      )}
    </>
  )
}
