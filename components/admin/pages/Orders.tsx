'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAdminRpc, useAction, PageHead, Badge, Loading, Empty, Table, Th, Td, Panel, ConfirmButton, Field } from '../ui'
import { inr, dateTime, grams, phoneDisplay } from '@/lib/format'
import { getBackend } from '@/lib/backend'
import { waLink, telLink, SITE } from '@/lib/site'
import { getDict } from '@/lib/i18n'
import { WhatsAppIcon } from '@/components/ui/Icons'
import type { Order } from '@/components/account/OrderView'

const STATUSES = ['Order Placed', 'Order Confirmed', 'Processing', 'Dispatched', 'Out for Delivery', 'Delivered', 'Cancelled']
const hi = getDict('hi')

export function statusTone(s: string) {
  return s === 'Order Placed' ? 'brand' : s === 'Delivered' ? 'leaf' : s === 'Cancelled' ? 'ink' : 'turmeric'
}

export function OrdersList() {
  const [f, setF] = useState({ status: 'open', payment_status: '', q: '', from: '', to: '', cancel_requests: false })
  useEffect(() => {
    const u = new URLSearchParams(location.search)
    setF((x) => ({ ...x, status: u.get('status') ?? x.status, payment_status: u.get('payment') ?? '', cancel_requests: u.get('cancel') === '1' }))
  }, [])
  const { data } = useAdminRpc<{ items: (Order & { item_count: number })[]; total: number }>('admin_orders', { ...f, status: f.cancel_requests ? '' : f.status, limit: 200 })
  return (
    <div>
      <PageHead title="Orders" sub="Confirm orders, record payments, move them forward and send updates on WhatsApp." />
      <div className="mb-5 grid gap-3 rounded-2xl bg-white p-4 shadow-[inset_0_0_0_1px_var(--color-line)] sm:grid-cols-2 lg:grid-cols-6">
        <Field label="Search" className="lg:col-span-2">
          <input className="input" placeholder="Order no., name or phone" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        </Field>
        <Field label="Status">
          <select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, cancel_requests: false })}>
            <option value="open">Open (not delivered)</option>
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Payment">
          <select className="input" value={f.payment_status} onChange={(e) => setF({ ...f, payment_status: e.target.value })}>
            <option value="">Any</option>
            <option value="unpaid">Not paid</option>
            <option value="pending_verification">UPI to check</option>
            <option value="paid">Paid</option>
          </select>
        </Field>
        <Field label="From">
          <input type="date" className="input" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
        </Field>
        <Field label="To">
          <input type="date" className="input" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
        </Field>
        <label className="flex items-center gap-2 lg:col-span-6">
          <input type="checkbox" checked={f.cancel_requests} onChange={(e) => setF({ ...f, cancel_requests: e.target.checked })} className="h-5 w-5 accent-[var(--color-ink)]" />
          Only open cancellation requests
        </label>
      </div>
      {!data ? (
        <Loading />
      ) : data.items.length === 0 ? (
        <Empty>No orders match these filters.</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Placed</Th>
              <Th>Customer</Th>
              <Th>Delivery</Th>
              <Th>Status</Th>
              <Th>Payment</Th>
              <Th className="text-right">Total</Th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((o) => (
              <tr key={o.id} className="hover:bg-paper-2">
                <Td>
                  <Link href={`/admin/orders/view/?id=${o.id}`} className="font-semibold text-brand underline-offset-2 hover:underline tnum">
                    {o.number}
                  </Link>
                  {o.is_test && <span className="ml-2 text-[0.75rem] text-muted">test</span>}
                </Td>
                <Td className="whitespace-nowrap text-muted">{dateTime(o.created_at)}</Td>
                <Td>
                  {o.customer_name}
                  <span className="block text-[0.8rem] text-muted">{phoneDisplay(o.phone)}</span>
                </Td>
                <Td>
                  {o.method}
                  <span className="block text-[0.8rem] text-muted">{o.zone === 'nanded' ? 'Nanded' : 'Outside'}</span>
                </Td>
                <Td>
                  <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                  {o.cancel_requested_at && !o.cancel_decision && (
                    <span className="mt-1 block">
                      <Badge tone="brand">Cancel requested</Badge>
                    </span>
                  )}
                </Td>
                <Td>
                  <Badge tone={o.payment_status === 'paid' ? 'leaf' : o.payment_status === 'pending_verification' ? 'turmeric' : 'neutral'}>{o.payment_status.replace('_', ' ')}</Badge>
                </Td>
                <Td className="text-right font-semibold tnum">{inr(o.total)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {data && <p className="mt-3 text-[0.85rem] text-muted">{data.total} order(s)</p>}
    </div>
  )
}

interface AdminOrder extends Order {
  user_id: string
  customer: { email: string | null; whatsapp_opt_in: boolean } | null
  customer_orders: number
  paid_at: string | null
  paid_marked_by: string | null
  cancel_reason: string | null
}

export function statusMessage(o: { customer_name: string; number: string; status: string; total?: number; method?: string }) {
  const first = o.customer_name.split(' ')[0]
  const en = `Namaste ${first}! Your Gangasagar Kirana Stores order ${o.number} is now: ${o.status}.`
  const h = `आपका ऑर्डर ${o.number}: ${hi.order.statuses[o.status as keyof typeof hi.order.statuses] ?? o.status}।`
  const extra = o.status === 'Out for Delivery' && o.method !== 'pickup' ? ' It will reach you soon.' : o.status === 'Delivered' ? ' Thank you for shopping with us.' : ''
  return `${en}${extra}\n${h}\n- Gangasagar Kirana Stores, ${SITE.phones.main}`
}

export function OrderAdmin() {
  const [id, setId] = useState<string | null>(null)
  useEffect(() => setId(new URLSearchParams(location.search).get('id')), [])
  const { data: o, reload, error } = useAdminRpc<AdminOrder>('admin_order', { id }, [id])
  const { busy, run } = useAction()
  const [note, setNote] = useState('')
  const [ref, setRef] = useState('')
  if (!id) return <Loading />
  if (error) return <Empty>Order not found.</Empty>
  if (!o) return <Loading />
  const flow = STATUSES.slice(0, 6)
  const idx = flow.indexOf(o.status)
  const closed = o.status === 'Delivered' || o.status === 'Cancelled'
  const rpc = (fn: string, p: object, msg: string) =>
    run(async () => {
      const b = await getBackend()
      await b.rpc(fn, p)
      reload()
    }, msg)
  const next = flow.slice(idx + 1).filter((s) => !(o.method === 'pickup' && (s === 'Dispatched' || s === 'Out for Delivery')))
  return (
    <div>
      <Link href="/admin/orders/" className="text-[0.9rem] text-muted underline">
        ← All orders
      </Link>
      <PageHead
        title={o.number}
        sub={`${dateTime(o.created_at)} · ${o.zone === 'nanded' ? 'Nanded' : 'Outside Nanded'} · ${o.method}${o.is_test ? ' · TEST ORDER' : ''}`}
        actions={
          <>
            <a href={waLink(o.phone, statusMessage(o))} target="_blank" rel="noopener" className="btn btn-ink btn-sm">
              <WhatsAppIcon className="h-4 w-4" /> Send update on WhatsApp
            </a>
            <button className="btn btn-ghost btn-sm" onClick={async () => (await import('@/lib/invoice')).downloadInvoice(o)}>
              Print invoice
            </button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Status">
            <div className="flex flex-wrap items-center gap-2">
              {flow.map((s, i) => (o.method === 'pickup' && (s === 'Dispatched' || s === 'Out for Delivery') ? null : (
                <Badge key={s} tone={o.status === 'Cancelled' ? 'neutral' : i < idx ? 'leaf' : i === idx ? 'brand' : 'neutral'}>
                  {s}
                </Badge>
              )))}
              {o.status === 'Cancelled' && <Badge tone="ink">Cancelled</Badge>}
            </div>
            {!closed && (
              <div className="mt-5 space-y-3">
                <Field label="Note for this update (optional, shown in the order history)">
                  <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
                </Field>
                <div className="flex flex-wrap gap-2">
                  {next.map((s, i) => (
                    <button key={s} className={`btn btn-sm ${i === 0 ? 'btn-brand' : 'btn-ghost'}`} disabled={busy} onClick={() => rpc('admin_set_order_status', { order_id: o.id, status: s, note }, `Moved to ${s}`).then(() => setNote(''))}>
                      Move to {s}
                    </button>
                  ))}
                  <ConfirmButton label="Cancel order" className="btn btn-ghost btn-sm" onConfirm={() => rpc('admin_cancel_order', { order_id: o.id, note }, 'Order cancelled; stock returned')} />
                </div>
                <p className="text-[0.85rem] text-muted">After changing the status, tap “Send update on WhatsApp” to tell the customer.</p>
              </div>
            )}
            {o.cancel_requested_at && !o.cancel_decision && (
              <div className="mt-5 rounded-xl bg-brand-light p-4">
                <p className="font-semibold text-brand-dark">The customer asked to cancel{o.cancel_reason ? `: “${o.cancel_reason}”` : '.'}</p>
                <div className="mt-3 flex gap-2">
                  <button className="btn btn-brand btn-sm" disabled={busy} onClick={() => rpc('admin_decide_cancellation', { order_id: o.id, approve: true }, 'Cancellation approved; stock returned')}>
                    Approve cancellation
                  </button>
                  <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => rpc('admin_decide_cancellation', { order_id: o.id, approve: false }, 'Cancellation rejected')}>
                    Reject
                  </button>
                </div>
              </div>
            )}
            <ol className="mt-6 space-y-1.5 border-t border-line pt-4 text-[0.9rem]">
              {o.events.map((e, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2">
                  <span>
                    <strong>{e.status}</strong> {e.note && <span className="text-muted">· {e.note}</span>}
                  </span>
                  <span className="text-muted">{dateTime(e.at)}</span>
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title="Items">
            <ul className="divide-y divide-line">
              {o.items.map((it) => (
                <li key={it.id} className="flex justify-between gap-3 py-2.5">
                  <span>
                    <strong>{it.name_en}</strong> <span className="text-muted">({it.name_hi})</span>
                    <span className="block text-[0.85rem] text-muted">{it.is_loose ? `${grams(it.quantity)} at ${inr(it.unit_price)}/kg` : `${it.quantity} × ${it.variant_en} at ${inr(it.unit_price)}`}</span>
                  </span>
                  <span className="font-semibold tnum">{inr(it.line_total)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-[0.95rem]">
              <div className="flex justify-between">
                <dt className="text-muted">Weight</dt>
                <dd className="tnum">{grams(o.total_weight_g)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tnum">{inr(o.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd className="tnum">{inr(o.delivery_fee)}</dd>
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <dt>Total</dt>
                <dd className="tnum">{inr(o.total)}</dd>
              </div>
            </dl>
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Payment">
            <p>
              {o.payment_method.replace(/_/g, ' ')} · <Badge tone={o.payment_status === 'paid' ? 'leaf' : o.payment_status === 'pending_verification' ? 'turmeric' : 'neutral'}>{o.payment_status.replace('_', ' ')}</Badge>
            </p>
            {o.upi_ref && (
              <p className="mt-2">
                UPI reference: <strong className="tnum">{o.upi_ref}</strong>
              </p>
            )}
            {o.paid_at && <p className="mt-1 text-[0.85rem] text-muted">Marked paid {dateTime(o.paid_at)} by {o.paid_marked_by}</p>}
            {o.payment_status !== 'paid' && o.status !== 'Cancelled' && (
              <div className="mt-4 space-y-3">
                {o.payment_method === 'upi_prepaid' && o.upi_ref && <p className="text-[0.9rem]">Check this reference in the store’s UPI app before marking paid.</p>}
                <Field label="UPI reference (optional for cash)">
                  <input className="input" value={ref} onChange={(e) => setRef(e.target.value.replace(/[^A-Za-z0-9]/g, ''))} maxLength={35} />
                </Field>
                <button className="btn btn-ink btn-sm" disabled={busy} onClick={() => rpc('admin_record_payment', { order_id: o.id, upi_ref: ref || null }, 'Payment recorded')}>
                  Mark as paid
                </button>
              </div>
            )}
          </Panel>
          <Panel title="Customer">
            <p className="font-semibold">{o.customer_name}</p>
            <p className="text-muted">{o.customer?.email ?? (o as unknown as { email?: string }).email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={telLink(o.phone)} className="btn btn-ghost btn-sm">
                Call {phoneDisplay(o.phone)}
              </a>
              <a href={waLink(o.phone)} target="_blank" rel="noopener" className="btn btn-ghost btn-sm">
                WhatsApp
              </a>
            </div>
            <p className="mt-3 text-[0.85rem] text-muted">
              {o.customer_orders} order(s) in total · WhatsApp offers: {o.customer?.whatsapp_opt_in ? 'yes' : 'no'}
            </p>
            {o.address && (
              <div className="mt-4 border-t border-line pt-3 text-[0.95rem]">
                <p className="font-semibold">Deliver to</p>
                <p>{o.address.name}</p>
                <p className="text-muted">{[o.address.line1, o.address.line2, o.address.landmark, o.address.city, o.address.state, o.address.pincode].filter(Boolean).join(', ')}</p>
              </div>
            )}
            {o.notes && (
              <div className="mt-4 rounded-xl bg-turmeric/15 p-3 text-[0.95rem]">
                <strong>Customer note:</strong> {o.notes}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
