'use client'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { useI18n } from '@/components/providers/I18n'
import { useSession } from '@/components/providers/Session'
import { useCart, fetchSnaps, type CartSnap } from '@/components/providers/Cart'
import { useLive } from '@/components/providers/Live'
import { useToast } from '@/components/ui/Toast'
import { getBackend, errorCode } from '@/lib/backend'
import { search } from '@/lib/search'
import { useSearchIndex } from '@/components/layout/SearchDialog'
import { grams } from '@/lib/format'
import { QtyStepper } from '@/components/cart/QtyStepper'
import { AddressForm, EMPTY_ADDRESS, addressErrors, type AddressValue } from '@/components/checkout/AddressForm'
import { GoogleG } from '@/components/checkout/Checkout'

interface Row {
  variant_id: string
  quantity: number
  snap: CartSnap
}

export function WholesaleBuilder() {
  const { t, f, lang, p, href } = useI18n()
  const session = useSession()
  const cart = useCart()
  const live = useLive()
  const toast = useToast()
  const router = useRouter()
  const bulk = live.settings.fees.bulk_threshold_g
  const [rows, setRows] = useState<Row[]>([])
  const [q, setQ] = useState('')
  const index = useSearchIndex(true)
  const results = useMemo(() => (index && q.trim() ? search(index, q, 8) : []), [index, q])
  const [zone, setZone] = useState<'nanded' | 'outside'>('nanded')
  const [method, setMethod] = useState('delivery')
  const [addr, setAddr] = useState<AddressValue>(EMPTY_ADDRESS)
  const [contact, setContact] = useState({ name: '', phone: '' })
  const [notes, setNotes] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState<string | null>(null)

  useEffect(() => {
    if (new URLSearchParams(location.search).get('from') === 'bag') setRows(cart.items.map((i) => ({ variant_id: i.variant_id, quantity: i.quantity, snap: i.snap })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => setMethod(zone === 'nanded' ? 'delivery' : 'transport'), [zone])
  useEffect(() => {
    if (session.profile) {
      setContact((c) => ({ name: c.name || session.profile?.full_name || '', phone: c.phone || session.profile?.phone || '' }))
      setAddr((a) => ({ ...a, name: a.name || session.profile?.full_name || '', phone: a.phone || session.profile?.phone || '' }))
    }
  }, [session.profile])

  const weight = rows.reduce((a, r) => a + (r.snap.is_loose ? r.quantity : r.quantity * r.snap.unit_weight_g), 0)
  const enough = weight >= bulk

  async function addProduct(productId: string) {
    setQ('')
    const r = await fetch('/catalogue-lite.json').then((x) => x.json())
    const vid = Object.keys(r.v).find((k) => r.v[k][0] === productId)
    if (!vid || rows.some((x) => x.variant_id === vid)) return
    const snaps = await fetchSnaps([vid])
    const s = snaps[vid]
    if (s) setRows((rs) => [...rs, { variant_id: vid, quantity: s.snap.is_loose ? 5000 : 10, snap: s.snap }])
  }

  async function send() {
    setTried(true)
    if (!enough) return
    if (method !== 'pickup' && Object.keys(addressErrors(addr)).length) return toast(t.checkout.errors.bad_address, 'error')
    if (method === 'pickup' && (contact.name.trim().length < 2 || !/^[6-9]\d{9}$/.test(contact.phone))) return toast(t.checkout.errors.bad_contact, 'error')
    setBusy(true)
    try {
      const b = await getBackend()
      const r = await b.rpc<{ number: string }>('request_quotation', {
        items: rows.map((x) => ({ variant_id: x.variant_id, quantity: x.quantity })),
        zone,
        method,
        notes,
        ...(method === 'pickup' ? { contact } : { address: addr }),
      })
      b.invoke('notify', { quotation: r.number }).catch(() => {})
      setSent(r.number)
    } catch (x) {
      const c = errorCode(x)
      toast(c === 'below_bulk_weight' ? f(t.wholesale.needMore, { kg: grams(bulk - weight, lang) }) : (t.checkout.errors[c as keyof typeof t.checkout.errors] ?? c), 'error')
    } finally {
      setBusy(false)
    }
  }

  if (sent)
    return (
      <div className="max-w-xl rounded-[1.75rem] bg-leaf-light p-8">
        <p className="display-s text-leaf">{f(t.wholesale.sent, { number: sent })}</p>
        <button className="btn btn-ink mt-6" onClick={() => router.push(`${href('/account/')}?tab=quotations`)}>
          {t.account.quotations}
        </button>
      </div>
    )

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <h2 className="display-s">{t.wholesale.builder}</h2>
        <div className="relative mt-5">
          <label className="field">
            <span>{t.wholesale.addProduct}</span>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.wholesale.searchProduct} type="search" />
          </label>
          {results.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-2xl bg-paper p-1 shadow-[0_20px_50px_-20px_rgb(31_26_23/0.5)] ring-1 ring-line">
              {results.map((d) => (
                <li key={d.id}>
                  <button className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-paper-2" onClick={() => addProduct(d.id)}>
                    <span className="font-semibold">{lang === 'hi' ? d.hi : d.en}</span> <span className="text-muted">{lang === 'hi' ? d.en : d.hi}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {cart.items.length > 0 && (
          <button className="link-u mt-3 text-[0.95rem]" onClick={() => setRows(cart.items.map((i) => ({ variant_id: i.variant_id, quantity: i.quantity, snap: i.snap })))}>
            {t.wholesale.fromCart}
          </button>
        )}
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {rows.map((r) => (
            <li key={r.variant_id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{p(r.snap, 'name')}</span>
                <span className="text-[0.85rem] text-muted">{r.snap.is_loose ? t.sell.loose : p(r.snap, 'label')}</span>
              </span>
              <QtyStepper
                size="sm"
                value={r.quantity}
                isLoose={r.snap.is_loose}
                min={r.snap.is_loose ? 1000 : 1}
                step={r.snap.is_loose ? 1000 : 1}
                max={r.snap.is_loose ? 10_000_000 : 999}
                onChange={(v) => setRows((rs) => rs.map((x) => (x.variant_id === r.variant_id ? { ...x, quantity: v } : x)))}
                label={p(r.snap, 'name')}
              />
              <button className="icon-btn text-muted hover:text-brand" onClick={() => setRows((rs) => rs.filter((x) => x.variant_id !== r.variant_id))} aria-label={f(t.cart.remove, { name: p(r.snap, 'name') })}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {!rows.length && <li className="py-6 text-muted">{t.wholesale.searchProduct}</li>}
        </ul>
        <div className="mt-5">
          <div className="h-3 overflow-hidden rounded-full bg-ink/10">
            <div className={`h-full rounded-full transition-[width] duration-700 ${enough ? 'bg-leaf' : 'bg-turmeric'}`} style={{ width: `${Math.min(100, (weight / bulk) * 100)}%` }} />
          </div>
          <p className="mt-2 flex justify-between text-[0.95rem]">
            <span>
              {t.wholesale.total}: <span className="font-semibold tnum">{grams(weight, lang)}</span>
            </span>
            {!enough && <span className="text-muted">{f(t.wholesale.needMore, { kg: grams(bulk - weight, lang) })}</span>}
          </p>
        </div>
      </div>

      <aside className="lg:col-span-5">
        <div className="rounded-[1.75rem] bg-paper-2 p-6 lg:sticky lg:top-28">
          {!session.user ? (
            <>
              <p className="font-semibold">{t.checkout.signInTitle}</p>
              <p className="mt-2 text-muted">{t.checkout.signInBody}</p>
              <button className="btn btn-ink mt-5" onClick={() => session.signIn()}>
                <GoogleG /> {t.checkout.google}
              </button>
            </>
          ) : (
            <div className="grid gap-5">
              <fieldset>
                <legend className="mb-2 font-semibold">{t.checkout.where}</legend>
                <div className="flex flex-wrap gap-2">
                  <button className="chip" aria-pressed={zone === 'nanded'} onClick={() => setZone('nanded')}>
                    {t.checkout.nanded}
                  </button>
                  <button className="chip" aria-pressed={zone === 'outside'} onClick={() => setZone('outside')}>
                    {t.checkout.outside}
                  </button>
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-2 font-semibold">{t.checkout.method}</legend>
                <div className="flex flex-wrap gap-2">
                  {(zone === 'nanded' ? ['delivery', 'pickup'] : ['transport', 'courier']).map((m) => (
                    <button key={m} className="chip" aria-pressed={method === m} onClick={() => setMethod(m)}>
                      {t.order.methods[m as 'delivery']}
                    </button>
                  ))}
                </div>
              </fieldset>
              {method === 'pickup' ? (
                <div className="grid gap-3">
                  <label className="field">
                    <span>{t.checkout.name}</span>
                    <input className="input" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>{t.checkout.phone}</span>
                    <input className="input" value={contact.phone} inputMode="numeric" maxLength={10} onChange={(e) => setContact({ ...contact, phone: e.target.value.replace(/\D/g, '') })} />
                  </label>
                </div>
              ) : (
                <AddressForm value={addr} onChange={setAddr} showErrors={tried} idPrefix="ws" />
              )}
              <label className="field">
                <span>
                  {t.checkout.notes} <span className="font-normal text-muted">({t.common.optional})</span>
                </span>
                <textarea className="input !min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
              </label>
              <button className="btn btn-brand btn-lg" onClick={send} disabled={busy || !enough || !rows.length}>
                {t.wholesale.send}
              </button>
              <p className="text-[0.85rem] text-muted">{t.wholesale.noFixedDiscount}</p>
            </div>
          )}
          <Link href={`${href('/account/')}?tab=quotations`} className="link-u mt-5 inline-block text-[0.95rem]">
            {t.account.quotations}
          </Link>
        </div>
      </aside>
    </div>
  )
}
