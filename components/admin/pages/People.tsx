'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getBackend } from '@/lib/backend'
import { dateShort, dateTime, grams, inr, phoneDisplay } from '@/lib/format'
import { waLink, telLink } from '@/lib/site'
import { WhatsAppIcon } from '@/components/ui/Icons'
import { useAdminRpc, useAction, PageHead, Badge, Loading, Empty, Table, Th, Td, Panel, Field, ConfirmButton, download } from '../ui'
import type { Quotation } from '@/components/account/Quotations'
import { statusTone } from './Orders'

// ---------------------------------------------------------------- Quotations
interface AQ extends Quotation {
  customer_name: string
  phone: string
  email: string | null
  notes: string | null
  admin_note: string | null
  address: Record<string, string> | null
}

export function QuotationsAdmin() {
  const [status, setStatus] = useState('requested')
  const { data, reload } = useAdminRpc<AQ[]>('admin_quotations', { status })
  const [open, setOpen] = useState<AQ | null>(null)
  return (
    <div>
      <PageHead title="Quotations" sub="Price wholesale requests (20 kg or more), then send the quotation on WhatsApp. The customer accepts it in their account." />
      <div className="mb-5 flex flex-wrap gap-2">
        {['requested', 'quoted', 'accepted', 'declined', 'expired', ''].map((s) => (
          <button key={s} className="chip" aria-pressed={status === s} onClick={() => setStatus(s)}>
            {s || 'all'}
          </button>
        ))}
      </div>
      {!data ? (
        <Loading />
      ) : data.length === 0 ? (
        <Empty>No quotations here.</Empty>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.map((q) => (
            <Panel key={q.id} title={`${q.number} · ${q.customer_name}`} actions={<Badge tone={q.status === 'requested' ? 'brand' : q.status === 'quoted' ? 'turmeric' : q.status === 'accepted' ? 'leaf' : 'neutral'}>{q.status}</Badge>}>
              <p className="text-[0.9rem] text-muted">
                {dateTime(q.created_at)} · {grams(q.total_weight_g)} · {q.zone === 'nanded' ? 'Nanded' : 'Outside Nanded'} · {q.method}
              </p>
              <ul className="mt-3 text-[0.92rem]">
                {(q.quoted_items ?? q.requested_items).map((l) => (
                  <li key={l.variant_id} className="flex justify-between gap-2 py-0.5">
                    <span>
                      {l.name_en} <span className="text-muted">{l.is_loose ? grams(l.quantity) : `${l.quantity} × ${l.variant_en}`}</span>
                    </span>
                    {q.quoted_items && <span className="tnum">{inr(l.line_total)}</span>}
                  </li>
                ))}
              </ul>
              {q.notes && <p className="mt-2 rounded-lg bg-paper-2 p-2 text-[0.9rem]">“{q.notes}”</p>}
              {q.total != null && <p className="mt-2 font-semibold">Total {inr(q.total)} (shipping {inr(q.shipping ?? 0)}), valid until {q.valid_until && dateShort(q.valid_until)}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {['requested', 'quoted', 'expired'].includes(q.status) && (
                  <button className="btn btn-brand btn-sm" onClick={() => setOpen(q)}>
                    {q.status === 'requested' ? 'Enter prices' : 'Edit prices'}
                  </button>
                )}
                {q.status === 'quoted' && (
                  <a href={waLink(q.phone, quoteMessage(q))} target="_blank" rel="noopener" className="btn btn-ink btn-sm">
                    <WhatsAppIcon className="h-4 w-4" /> Send on WhatsApp
                  </a>
                )}
                <a href={telLink(q.phone)} className="btn btn-ghost btn-sm">
                  Call {phoneDisplay(q.phone)}
                </a>
                {q.order_id && (
                  <Link href={`/admin/orders/view/?id=${q.order_id}`} className="btn btn-ghost btn-sm">
                    Open order
                  </Link>
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}
      {open && (
        <QuoteEditor
          q={open}
          onClose={() => setOpen(null)}
          onDone={() => {
            setOpen(null)
            reload()
          }}
        />
      )}
    </div>
  )
}

function quoteMessage(q: AQ) {
  const lines = (q.quoted_items ?? []).map((l) => `- ${l.name_en}: ${l.is_loose ? grams(l.quantity) : `${l.quantity} x ${l.variant_en}`} at ${inr(l.unit_price)}${l.is_loose ? '/kg' : ''} = ${inr(l.line_total)}`)
  return [
    `Namaste ${q.customer_name.split(' ')[0]}! Your Gangasagar Kirana Stores quotation ${q.number}:`,
    ...lines,
    `Shipping: ${inr(q.shipping ?? 0)}`,
    `Total: ${inr(q.total ?? 0)}`,
    q.valid_until ? `Valid until ${dateShort(q.valid_until)}.` : '',
    'Accept it in your account on our website (Account > Quotations).',
    'आपका कोटेशन तैयार है। वेबसाइट पर खाता > कोटेशन में स्वीकार करें।',
  ]
    .filter(Boolean)
    .join('\n')
}

function QuoteEditor({ q, onClose, onDone }: { q: AQ; onClose: () => void; onDone: () => void }) {
  const src = q.quoted_items ?? q.requested_items
  const [items, setItems] = useState(src.map((l) => ({ variant_id: l.variant_id, name: l.name_en, label: l.variant_en, is_loose: l.is_loose, quantity: l.quantity, unit_price: String(q.quoted_items ? l.unit_price : '') , retail: (l as { list_price?: number }).list_price ?? l.unit_price })))
  const [shipping, setShipping] = useState(String(q.shipping ?? (q.zone === 'nanded' ? 0 : '')))
  const [valid, setValid] = useState(q.valid_until ?? new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10))
  const [note, setNote] = useState(q.admin_note ?? '')
  const { busy, run } = useAction()
  const total = items.reduce((a, l) => a + (Number(l.unit_price) || 0) * (l.is_loose ? l.quantity / 1000 : l.quantity), 0) + (Number(shipping) || 0)
  async function save() {
    const ok = await run(async () => {
      const b = await getBackend()
      await b.rpc('admin_quote', { id: q.id, items: items.map((l) => ({ variant_id: l.variant_id, quantity: l.quantity, unit_price: Number(l.unit_price) })), shipping: Number(shipping), valid_until: valid, note })
      return true
    }, 'Quotation saved. Now send it on WhatsApp.')
    if (ok) onDone()
  }
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/50 p-4" role="dialog" aria-modal aria-label={`Price ${q.number}`}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] bg-paper p-6">
        <h2 className="font-display text-2xl font-[650]">Price {q.number}</h2>
        <p className="text-muted">Retail price shown for reference. Loose items: price per kg.</p>
        <div className="mt-4 space-y-3">
          {items.map((l, i) => (
            <div key={l.variant_id} className="grid grid-cols-12 items-end gap-2">
              <div className="col-span-6">
                <p className="font-semibold">{l.name}</p>
                <p className="text-[0.85rem] text-muted">
                  {l.is_loose ? grams(l.quantity) : `${l.quantity} × ${l.label}`} · retail {inr(l.retail)}
                  {l.is_loose ? '/kg' : ''}
                </p>
              </div>
              <Field label={l.is_loose ? '₹ per kg' : '₹ each'} className="col-span-3">
                <input className="input" type="number" min={0} step="0.5" value={l.unit_price} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, unit_price: e.target.value } : x)))} required />
              </Field>
              <Field label="Qty" className="col-span-3">
                <input className="input" type="number" min={1} value={l.quantity} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, quantity: Number(e.target.value) } : x)))} />
              </Field>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Field label="Shipping (₹)">
            <input className="input" type="number" min={0} value={shipping} onChange={(e) => setShipping(e.target.value)} />
          </Field>
          <Field label="Price valid until">
            <input className="input" type="date" value={valid} onChange={(e) => setValid(e.target.value)} />
          </Field>
          <Field label="Note for the customer (optional)" className="sm:col-span-2">
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
        <p className="mt-4 text-xl font-semibold tnum">Total {inr(Math.round(total * 100) / 100)}</p>
        <div className="mt-5 flex gap-2">
          <button className="btn btn-brand" onClick={save} disabled={busy || items.some((l) => l.unit_price === '')}>
            Save quotation
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Customers
interface Cust {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  whatsapp_opt_in: boolean
  created_at: string
  orders: number
  spent: number
  last_order_at: string | null
}

export function CustomersAdmin() {
  const [q, setQ] = useState('')
  const [opted, setOpted] = useState(false)
  const { data } = useAdminRpc<Cust[]>('admin_customers', { q, opted_in: opted })
  const [open, setOpen] = useState<string | null>(null)
  function exportOptIns() {
    if (!data) return
    const rows = data.filter((c) => c.whatsapp_opt_in && c.phone).map((c) => `${(c.full_name ?? '').replace(/,/g, ' ')},+91${c.phone}`)
    download('whatsapp-broadcast-list.csv', ['name,phone', ...rows].join('\n'), 'text/csv')
  }
  return (
    <div>
      <PageHead
        title="Customers"
        sub="Everyone who signed in. For WhatsApp promotions, add only opted-in customers to a broadcast list in the WhatsApp Business app."
        actions={
          <button className="btn btn-ghost btn-sm" onClick={exportOptIns}>
            Download opted-in numbers (CSV)
          </button>
        }
      />
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <Field label="Search" className="w-72">
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or phone" />
        </Field>
        <label className="flex items-center gap-2 pb-3">
          <input type="checkbox" checked={opted} onChange={(e) => setOpted(e.target.checked)} className="h-5 w-5 accent-[var(--color-ink)]" /> Only opted in to WhatsApp offers
        </label>
      </div>
      {!data ? (
        <Loading />
      ) : data.length === 0 ? (
        <Empty>No customers yet.</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Customer</Th>
              <Th>Phone</Th>
              <Th>Orders</Th>
              <Th className="text-right">Spent</Th>
              <Th>Offers</Th>
              <Th>Since</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id} className="cursor-pointer hover:bg-paper-2" onClick={() => setOpen(c.id)}>
                <Td>
                  <strong>{c.full_name ?? '-'}</strong>
                  <span className="block text-[0.85rem] text-muted">{c.email}</span>
                </Td>
                <Td className="tnum">{c.phone ? phoneDisplay(c.phone) : '-'}</Td>
                <Td className="tnum">{c.orders}</Td>
                <Td className="text-right tnum">{inr(c.spent)}</Td>
                <Td>{c.whatsapp_opt_in ? <Badge tone="leaf">yes</Badge> : <span className="text-muted">no</span>}</Td>
                <Td className="text-muted">{dateShort(c.created_at)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {open && <CustomerPanel id={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function CustomerPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const { data } = useAdminRpc<Cust & { addresses: Record<string, string>[]; orders: { id: string; number: string; status: string; total: number; created_at: string }[] }>('admin_customer', { id }, [id])
  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-ink/40" onClick={onClose}>
      <aside className="h-full w-full max-w-md overflow-y-auto bg-paper p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Customer">
        <button className="float-right underline" onClick={onClose}>
          Close
        </button>
        {!data ? (
          <Loading />
        ) : (
          <>
            <h2 className="font-display text-2xl font-[650]">{data.full_name ?? data.email}</h2>
            <p className="text-muted">{data.email}</p>
            {data.phone && (
              <div className="mt-3 flex gap-2">
                <a href={telLink(data.phone)} className="btn btn-ghost btn-sm">
                  Call
                </a>
                <a href={waLink(data.phone)} target="_blank" rel="noopener" className="btn btn-ghost btn-sm">
                  WhatsApp
                </a>
              </div>
            )}
            <h3 className="mt-6 font-semibold">Addresses</h3>
            {data.addresses.length === 0 ? <p className="text-muted">None saved.</p> : data.addresses.map((a, i) => <p key={i} className="mt-1 text-[0.9rem]">{[a.name, a.line1, a.city, a.pincode].filter(Boolean).join(', ')}</p>)}
            <h3 className="mt-6 font-semibold">Orders</h3>
            <ul className="mt-1 divide-y divide-line">
              {data.orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/view/?id=${o.id}`} className="flex justify-between gap-2 py-2 hover:text-brand">
                    <span className="tnum">{o.number}</span>
                    <Badge tone={statusTone(o.status) as 'brand'}>{o.status}</Badge>
                    <span className="tnum">{inr(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>
    </div>
  )
}

// ---------------------------------------------------------------- Enquiries
interface Enq {
  id: string
  kind: string
  name: string
  phone: string | null
  email: string | null
  message: string | null
  product_id: string | null
  quantity_g: number | null
  status: 'pending' | 'resolved'
  admin_note: string | null
  created_at: string
}

export function EnquiriesAdmin() {
  const [status, setStatus] = useState<'pending' | 'resolved' | ''>('pending')
  const [rows, setRows] = useState<Enq[] | null>(null)
  const { run } = useAction()
  const load = () =>
    getBackend()
      .then((b) => b.select<Enq>('enquiries', 'id,kind,name,phone,email,message,product_id,quantity_g,status,admin_note,created_at', { ...(status ? { eq: { status } } : {}), order: ['created_at', 'desc'], limit: 300 }))
      .then(setRows)
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])
  const mark = (e: Enq, s: 'pending' | 'resolved') =>
    run(async () => {
      const b = await getBackend()
      await b.update('enquiries', { status: s, resolved_at: s === 'resolved' ? new Date().toISOString() : null }, { eq: { id: e.id } })
      load()
    }, s === 'resolved' ? 'Marked resolved' : 'Marked pending')
  return (
    <div>
      <PageHead title="Enquiries" sub="Contact form messages, product questions and custom-quantity requests. Reply by call, WhatsApp or email, then mark resolved." />
      <div className="mb-5 flex gap-2">
        {(['pending', 'resolved', ''] as const).map((s) => (
          <button key={s} className="chip" aria-pressed={status === s} onClick={() => setStatus(s)}>
            {s || 'all'}
          </button>
        ))}
      </div>
      {!rows ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty>No enquiries here.</Empty>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {rows.map((e) => (
            <Panel key={e.id} title={e.name} actions={<Badge tone={e.kind === 'custom_quantity' ? 'turmeric' : 'neutral'}>{e.kind.replace('_', ' ')}</Badge>}>
              <p className="text-[0.85rem] text-muted">{dateTime(e.created_at)}</p>
              {e.product_id && (
                <p className="mt-2">
                  Product: <a className="underline" href={`/en/product/${e.product_id}/`} target="_blank">{e.product_id}</a>
                  {e.quantity_g && <strong> · {grams(e.quantity_g)}</strong>}
                </p>
              )}
              {e.message && <p className="mt-2 whitespace-pre-line">{e.message}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {e.phone && (
                  <>
                    <a href={telLink(e.phone)} className="btn btn-ghost btn-sm">
                      Call {phoneDisplay(e.phone)}
                    </a>
                    <a href={waLink(e.phone, `Namaste ${e.name.split(' ')[0]}, this is Gangasagar Kirana Stores replying to your message.`)} target="_blank" rel="noopener" className="btn btn-ghost btn-sm">
                      WhatsApp
                    </a>
                  </>
                )}
                {e.email && (
                  <a href={`mailto:${e.email}?subject=${encodeURIComponent('Gangasagar Kirana Stores')}`} className="btn btn-ghost btn-sm">
                    Email
                  </a>
                )}
                {e.status === 'pending' ? (
                  <button className="btn btn-ink btn-sm" onClick={() => mark(e, 'resolved')}>
                    Mark resolved
                  </button>
                ) : (
                  <button className="btn btn-ghost btn-sm" onClick={() => mark(e, 'pending')}>
                    Reopen
                  </button>
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Reviews
interface Rev {
  id: string
  product_id: string
  author_name: string
  rating: number
  body: string | null
  status: 'pending' | 'approved' | 'rejected'
  verified_purchase: boolean
  created_at: string
}

export function ReviewsAdmin() {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [rows, setRows] = useState<Rev[] | null>(null)
  const { run } = useAction()
  const load = () =>
    getBackend()
      .then((b) => b.select<Rev>('reviews', 'id,product_id,author_name,rating,body,status,verified_purchase,created_at', { eq: { status }, order: ['created_at', 'desc'] }))
      .then(setRows)
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])
  const act = (r: Rev, s: 'approved' | 'rejected' | 'delete') =>
    run(async () => {
      const b = await getBackend()
      if (s === 'delete') await b.remove('reviews', { eq: { id: r.id } })
      else await b.update('reviews', { status: s }, { eq: { id: r.id } })
      load()
    }, s === 'delete' ? 'Review deleted' : `Review ${s}`)
  return (
    <div>
      <PageHead title="Reviews" sub="Product reviews show on the website only after you approve them. The verified badge comes from real delivered orders." />
      <div className="mb-5 flex gap-2">
        {(['pending', 'approved', 'rejected'] as const).map((s) => (
          <button key={s} className="chip" aria-pressed={status === s} onClick={() => setStatus(s)}>
            {s}
          </button>
        ))}
      </div>
      {!rows ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty>No {status} reviews.</Empty>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {rows.map((r) => (
            <Panel key={r.id} title={`${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}  ${r.author_name}`}>
              <p className="text-[0.85rem] text-muted">
                <a className="underline" href={`/en/product/${r.product_id}/`} target="_blank">
                  {r.product_id}
                </a>{' '}
                · {dateShort(r.created_at)} {r.verified_purchase && <Badge tone="leaf">verified purchase</Badge>}
              </p>
              {r.body && <p className="mt-2">{r.body}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {r.status !== 'approved' && (
                  <button className="btn btn-ink btn-sm" onClick={() => act(r, 'approved')}>
                    Approve
                  </button>
                )}
                {r.status !== 'rejected' && (
                  <button className="btn btn-ghost btn-sm" onClick={() => act(r, 'rejected')}>
                    Reject
                  </button>
                )}
                <ConfirmButton onConfirm={() => act(r, 'delete')} />
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  )
}
