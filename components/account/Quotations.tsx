'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/components/providers/I18n'
import { useToast } from '@/components/ui/Toast'
import { getBackend, errorCode } from '@/lib/backend'
import { dateShort, grams, inr } from '@/lib/format'

interface Line {
  variant_id: string
  name_en: string
  name_hi: string
  variant_en: string
  variant_hi: string
  is_loose: boolean
  quantity: number
  unit_price: number
  line_total: number
}
export interface Quotation {
  id: string
  number: string
  status: 'requested' | 'quoted' | 'accepted' | 'declined' | 'expired' | 'cancelled'
  zone: 'nanded' | 'outside'
  method: 'delivery' | 'pickup' | 'courier' | 'transport'
  requested_items: Line[]
  quoted_items: Line[] | null
  shipping: number | null
  total: number | null
  valid_until: string | null
  total_weight_g: number
  order_id: string | null
  created_at: string
}

export function Quotations() {
  const { t, lang, f, p, href } = useI18n()
  const toast = useToast()
  const router = useRouter()
  const [rows, setRows] = useState<Quotation[] | null>(null)
  const [terms, setTerms] = useState<Record<string, boolean>>({})
  const [pay, setPay] = useState<Record<string, string>>({})
  const load = useCallback(() => {
    getBackend()
      .then((b) => b.rpc<Quotation[]>('my_quotations'))
      .then(setRows)
      .catch(() => setRows([]))
  }, [])
  useEffect(load, [load])

  async function accept(q: Quotation) {
    try {
      const b = await getBackend()
      const r = await b.rpc<{ id: string }>('accept_quotation', { id: q.id, payment_method: pay[q.id] ?? (q.zone === 'outside' ? 'upi_prepaid' : 'cash'), accept_terms: !!terms[q.id] })
      router.push(`${href('/order/')}?id=${r.id}&new=1`)
    } catch (x) {
      const c = errorCode(x)
      toast(t.checkout.errors[c as keyof typeof t.checkout.errors] ?? c, 'error')
    }
  }
  async function decline(q: Quotation) {
    const b = await getBackend()
    await b.rpc('decline_quotation', { id: q.id }).catch(() => {})
    load()
  }

  if (!rows) return <div className="skeleton h-40" />
  if (!rows.length)
    return (
      <div className="max-w-xl rounded-[1.75rem] border-2 border-dashed border-line p-8">
        <p className="display-s">{t.account.noQuotations}</p>
        <Link href={href('/wholesale/')} className="btn btn-ink mt-6">
          {t.home.wholesaleCta}
        </Link>
      </div>
    )
  return (
    <div className="grid gap-5">
      {rows.map((q) => {
        const lines = q.quoted_items ?? q.requested_items
        return (
          <article key={q.id} className="rounded-[1.6rem] border border-line p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-2xl font-[650] tnum">{q.number}</h3>
              <span className={`rounded-full px-3 py-1 text-[0.8rem] font-semibold ${q.status === 'quoted' ? 'bg-leaf-light text-leaf' : 'bg-paper-2'}`}>{t.wholesale.status[q.status]}</span>
            </div>
            <p className="meta mt-1">
              {dateShort(q.created_at, lang)} · {grams(q.total_weight_g, lang)} · {t.order.methods[q.method]}
            </p>
            <ul className="mt-4 divide-y divide-line">
              {lines.map((l) => (
                <li key={l.variant_id} className="flex justify-between gap-3 py-2 text-[0.95rem]">
                  <span>
                    {p(l, 'name')} <span className="text-muted">{l.is_loose ? grams(l.quantity, lang) : `${l.quantity} × ${p(l, 'variant')}`}</span>
                  </span>
                  {q.quoted_items && <span className="tnum">{inr(l.line_total)}</span>}
                </li>
              ))}
            </ul>
            {q.status === 'quoted' && (
              <div className="mt-4 rounded-2xl bg-paper-2 p-4">
                <div className="flex justify-between">
                  <span className="text-muted">{t.wholesale.shipping}</span>
                  <span className="tnum">{inr(q.shipping ?? 0)}</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="font-semibold">{t.cart.total}</span>
                  <span className="font-display text-2xl font-[650] tnum">{inr(q.total ?? 0)}</span>
                </div>
                {q.valid_until && <p className="hand mt-2 text-[1.05rem]">{f(t.wholesale.validUntil, { date: dateShort(q.valid_until, lang) })}</p>}
                <div className="mt-4 grid gap-3">
                  {q.zone === 'nanded' ? (
                    <label className="field">
                      <span>{t.checkout.payment}</span>
                      <select className="input" value={pay[q.id] ?? 'cash'} onChange={(e) => setPay({ ...pay, [q.id]: e.target.value })}>
                        <option value="cash">{t.checkout.cash}</option>
                        <option value="upi_on_delivery">{t.checkout.upiOnDelivery}</option>
                      </select>
                    </label>
                  ) : (
                    <p className="text-[0.95rem]">{t.checkout.upiPrepaidBody}</p>
                  )}
                  <label className="flex items-start gap-3">
                    <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[var(--color-ink)]" checked={!!terms[q.id]} onChange={(e) => setTerms({ ...terms, [q.id]: e.target.checked })} />
                    <span>{t.checkout.terms.replace('{terms}', t.checkout.termsLink).replace('{shipping}', t.checkout.shippingLink)}</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn btn-brand" onClick={() => accept(q)} disabled={!terms[q.id]}>
                      {t.wholesale.accept}
                    </button>
                    <button className="btn btn-ghost" onClick={() => decline(q)}>
                      {t.wholesale.decline}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {q.order_id && (
              <Link href={`${href('/account/order/')}?id=${q.order_id}`} className="link-u mt-4 inline-block">
                {t.order.track}
              </Link>
            )}
          </article>
        )
      })}
      <p className="text-[0.9rem] text-muted">{t.wholesale.noFixedDiscount}</p>
    </div>
  )
}
