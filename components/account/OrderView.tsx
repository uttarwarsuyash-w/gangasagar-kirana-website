'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/components/providers/I18n'
import { useSession } from '@/components/providers/Session'
import { useLive } from '@/components/providers/Live'
import { useCart, fetchSnaps } from '@/components/providers/Cart'
import { useToast } from '@/components/ui/Toast'
import { getBackend, errorCode } from '@/lib/backend'
import { dateShort, grams, inr, phoneDisplay } from '@/lib/format'
import { SITE, telLink, waLink } from '@/lib/site'
import { WhatsAppIcon } from '@/components/ui/Icons'
import { OrderTracker } from './OrderTracker'
import { Picture } from '@/components/ui/Picture'

export interface OrderItem {
  id: number
  product_id: string
  variant_id: string
  name_en: string
  name_hi: string
  variant_en: string
  variant_hi: string
  is_loose: boolean
  quantity: number
  unit_price: number
  line_total: number
  weight_g: number
}
export interface Order {
  id: string
  number: string
  status: string
  zone: 'nanded' | 'outside'
  method: 'delivery' | 'pickup' | 'courier' | 'transport'
  payment_method: 'cash' | 'upi_on_delivery' | 'upi_prepaid'
  payment_status: 'unpaid' | 'pending_verification' | 'paid'
  upi_ref: string | null
  subtotal: number
  delivery_fee: number
  total: number
  total_weight_g: number
  customer_name: string
  phone: string
  address: Record<string, string> | null
  notes: string | null
  is_test: boolean
  created_at: string
  cancel_requested_at: string | null
  cancel_decision: 'approved' | 'rejected' | null
  quotation_id: string | null
  items: OrderItem[]
  events: { status: string; note: string | null; at: string }[]
}

export function OrderView({ id, isNew }: { id: string; isNew?: boolean }) {
  const { t, lang, f, p, href } = useI18n()
  const session = useSession()
  const [order, setOrder] = useState<Order | null>(null)
  const [missing, setMissing] = useState(false)

  const load = useCallback(() => {
    getBackend()
      .then((b) => b.rpc<Order>('my_order', { id }))
      .then(setOrder)
      .catch(() => setMissing(true))
  }, [id])

  useEffect(() => {
    if (session.user) load()
  }, [session.user, load])

  if (session.checked && !session.user)
    return (
      <div className="max-w-xl rounded-[1.75rem] bg-paper-2 p-8">
        <p className="display-s">{t.auth.title}</p>
        <p className="mt-2 text-muted">{t.auth.body}</p>
        <button className="btn btn-ink mt-6" onClick={() => session.signIn()}>
          {t.auth.google}
        </button>
      </div>
    )
  if (missing)
    return (
      <div className="max-w-xl">
        <p className="display-s">{t.order.notFound}</p>
        <Link href={href('/account/')} className="btn btn-ink mt-6">
          {t.account.orders}
        </Link>
      </div>
    )
  if (!order) return <div className="skeleton h-[32rem] max-w-4xl" />

  const addr = order.address
  return (
    <div className="grid gap-12 lg:grid-cols-12">
      <div className="lg:col-span-7">
        {isNew && (
          <div className="mb-8">
            <p className="hand text-[1.4rem] text-brand">{lang === 'hi' ? 'धन्यवाद!' : 'thank you!'}</p>
            <h1 className="display-l mt-1">{t.order.thanks}</h1>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {isNew && <span className="meta">{t.order.number}</span>}
          <p className={isNew ? 'font-display text-2xl font-[650] tnum' : 'display-s tnum'}>{order.number}</p>
          {order.is_test && <span className="rounded-full bg-brand-light px-3 py-1 text-[0.8rem] font-semibold text-brand-dark">{t.order.test}</span>}
        </div>
        <p className="meta mt-2">{f(t.order.placedOn, { date: dateShort(order.created_at, lang) })}</p>

        {isNew && (
          <div className="mt-8 rounded-[1.5rem] bg-paper-2 p-6">
            <h2 className="font-semibold">{t.order.next}</h2>
            <p className="mt-2 text-muted">{order.zone === 'outside' ? t.order.nextOutside : order.method === 'pickup' ? t.order.nextPickup : t.order.nextNanded}</p>
          </div>
        )}

        {order.payment_method === 'upi_prepaid' && order.payment_status !== 'paid' && order.status !== 'Cancelled' && <UpiPay order={order} onDone={load} />}

        <div className="mt-10">
          <OrderTracker status={order.status} events={order.events} method={order.method} />
        </div>

        <OrderActions order={order} onChange={load} />
      </div>

      <aside className="lg:col-span-5">
        <div className="rounded-[1.75rem] border border-line p-6">
          <h2 className="font-display text-xl font-[650]">{t.order.items}</h2>
          <ul className="mt-3 divide-y divide-line">
            {order.items.map((it) => (
              <li key={it.id} className="flex justify-between gap-3 py-3">
                <span>
                  <Link href={href(`/product/${it.product_id}/`)} className="font-semibold hover:text-brand">
                    {p(it, 'name')}
                  </Link>
                  <span className="block text-[0.85rem] text-muted">{it.is_loose ? `${grams(it.quantity, lang)} · ${inr(it.unit_price)} / ${t.common.kg}` : `${it.quantity} × ${p(it, 'variant')} · ${inr(it.unit_price)}`}</span>
                </span>
                <span className="font-semibold tnum">{inr(it.line_total)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-2 space-y-1.5 border-t border-line pt-4">
            <Row k={t.cart.weight} v={grams(order.total_weight_g, lang)} />
            <Row k={t.cart.subtotal} v={inr(order.subtotal)} />
            <Row k={`${t.cart.delivery} (${t.order.methods[order.method]})`} v={Number(order.delivery_fee) === 0 ? t.checkout.free : inr(order.delivery_fee)} />
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <dt className="font-semibold">{t.cart.total}</dt>
              <dd className="font-display text-2xl font-[650] tnum">{inr(order.total)}</dd>
            </div>
            <Row k={t.checkout.payment} v={`${t.order.paymentMethods[order.payment_method]} · ${t.order.payment[order.payment_status]}`} />
          </dl>
          {addr && (
            <div className="mt-5 border-t border-line pt-4 text-[0.95rem]">
              <p className="font-semibold">{addr.name}</p>
              <p className="text-muted">{[addr.line1, addr.line2, addr.landmark, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}</p>
              <p className="text-muted">{phoneDisplay(addr.phone)}</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 text-[0.95rem]">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right tnum">{v}</dd>
    </div>
  )
}

function UpiPay({ order, onDone }: { order: Order; onDone: () => void }) {
  const { t, f } = useI18n()
  const { upi } = useLive().settings
  const toast = useToast()
  const [ref, setRef] = useState(order.upi_ref ?? '')
  const [busy, setBusy] = useState(false)
  const link = upi.id ? `upi://pay?pa=${encodeURIComponent(upi.id)}&pn=${encodeURIComponent(upi.payee)}&am=${Number(order.total).toFixed(2)}&tn=${encodeURIComponent(order.number)}&cu=INR` : null
  async function send(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const b = await getBackend()
      await b.rpc('submit_upi_ref', { order_id: order.id, upi_ref: ref.trim() })
      toast(t.order.refSent)
      onDone()
    } catch (x) {
      toast(t.checkout.errors[errorCode(x) as keyof typeof t.checkout.errors] ?? errorCode(x), 'error')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mt-8 rounded-[1.5rem] bg-ink p-6 text-paper on-ink">
      <h2 className="display-s">{t.order.upiTitle}</h2>
      {order.payment_status === 'pending_verification' ? (
        <p className="mt-3 text-paper/80">{t.order.refSent}</p>
      ) : (
        <>
          {upi.id ? (
            <div className="mt-4 flex flex-wrap items-start gap-6">
              {upi.qr_url && (
                <div className="h-36 w-36 overflow-hidden rounded-xl bg-white p-2">
                  <Picture src={upi.qr_url} alt="UPI QR" fit="contain" />
                </div>
              )}
              <div>
                <p className="text-paper/70">{t.checkout.upiId}</p>
                <p className="text-xl font-semibold">{upi.id}</p>
                <p className="mt-1 text-paper/70">{order.number}</p>
                {link && (
                  <a href={link} className="btn btn-paper mt-4">
                    {f(t.checkout.payWithApp, { n: Number(order.total).toLocaleString('en-IN') })}
                  </a>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-paper/80">{t.checkout.upiMissing}</p>
          )}
          <form onSubmit={send} className="mt-6 flex flex-wrap items-end gap-3">
            <label className="field flex-1">
              <span>{t.checkout.upiRef}</span>
              <input className="input !text-ink" value={ref} onChange={(e) => setRef(e.target.value.replace(/[^A-Za-z0-9]/g, ''))} minLength={6} maxLength={35} required inputMode="numeric" />
              <span className="field-hint !text-paper/60">{t.checkout.upiRefHint}</span>
            </label>
            <button className="btn btn-brand" disabled={busy || ref.length < 6}>
              {t.order.submitRef}
            </button>
          </form>
        </>
      )}
    </div>
  )
}

function OrderActions({ order, onChange }: { order: Order; onChange: () => void }) {
  const { t, lang, f, href } = useI18n()
  const toast = useToast()
  const cart = useCart()
  const router = useRouter()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('')
  const canCancel = ['Order Placed', 'Order Confirmed', 'Processing'].includes(order.status) && !(order.cancel_requested_at && !order.cancel_decision)
  const wa = waLink(SITE.phones.main, f(t.order.whatsappMessage, { number: order.number }))

  async function requestCancel(e: React.FormEvent) {
    e.preventDefault()
    try {
      const b = await getBackend()
      await b.rpc('request_cancellation', { order_id: order.id, reason })
      toast(t.order.cancelRequested)
      setCancelOpen(false)
      onChange()
    } catch (x) {
      toast(errorCode(x), 'error')
    }
  }

  async function reorder() {
    const b = await getBackend()
    const r = await b.rpc<{ items: { variant_id: string; quantity: number }[]; missing: { name_en: string; name_hi: string }[] }>('reorder_items', { order_id: order.id })
    const snaps = await fetchSnaps(r.items.map((i) => i.variant_id))
    for (const it of r.items) {
      const s = snaps[it.variant_id]
      if (s) cart.add({ variant_id: it.variant_id, quantity: it.quantity, product_id: s.product_id, snap: s.snap })
    }
    if (r.missing.length) toast(f(t.order.reorderMissing, { names: r.missing.map((m) => (lang === 'hi' ? m.name_hi : m.name_en)).join(', ') }), 'info')
    router.push(href('/cart/'))
  }

  async function invoice() {
    const { downloadInvoice } = await import('@/lib/invoice')
    await downloadInvoice(order)
  }

  return (
    <div className="mt-10 space-y-4">
      <div className="flex flex-wrap gap-2">
        <a href={wa} target="_blank" rel="noopener" className="btn btn-ink">
          <WhatsAppIcon className="h-5 w-5" /> {t.order.whatsapp}
        </a>
        {order.status === 'Delivered' && (
          <button className="btn btn-ghost" onClick={invoice}>
            {t.order.invoice}
          </button>
        )}
        <button className="btn btn-ghost" onClick={reorder}>
          {t.order.reorder}
        </button>
        {canCancel && (
          <button className="btn btn-ghost" onClick={() => setCancelOpen(!cancelOpen)} aria-expanded={cancelOpen}>
            {t.order.requestCancel}
          </button>
        )}
      </div>
      {order.cancel_requested_at && !order.cancel_decision && <p className="rounded-xl bg-turmeric/20 p-3 font-semibold">{t.order.cancelRequested}</p>}
      {order.cancel_decision === 'rejected' && <p className="rounded-xl bg-paper-2 p-3">{t.order.cancelRejected}</p>}
      {cancelOpen && (
        <form onSubmit={requestCancel} className="flex flex-wrap items-end gap-3 rounded-2xl bg-paper-2 p-4">
          <label className="field flex-1">
            <span>{t.order.cancelReason}</span>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
          </label>
          <button className="btn btn-brand">{t.order.requestCancel}</button>
        </form>
      )}
      <p className="text-[0.9rem] text-muted">
        {t.order.problem}{' '}
        <a href={telLink(SITE.phones.main)} className="link-u">
          {phoneDisplay(SITE.phones.main)}
        </a>
      </p>
    </div>
  )
}
