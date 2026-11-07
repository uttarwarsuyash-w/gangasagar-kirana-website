'use client'
import { useEffect, useState } from 'react'
import { getBackend } from '@/lib/backend'
import { grams, dateTime } from '@/lib/format'
import { Dialog } from '@/components/ui/Dialog'
import { useAdminRpc, useAction, PageHead, Badge, Loading, Empty, Table, Th, Td, Field } from '../ui'

interface Inv {
  variant_id: string
  product_id: string
  category_id: string
  name_en: string
  name_hi: string
  label_en: string
  is_loose: boolean
  stock: number
  stock_is_sample: boolean
  limited_level: number
  availability: 'available' | 'limited' | 'out'
  hidden: boolean
}

export function Inventory() {
  const [f, setF] = useState({ q: '', filter: '', category_id: '' })
  useEffect(() => {
    const u = new URLSearchParams(location.search)
    if (u.get('filter')) setF((x) => ({ ...x, filter: u.get('filter')! }))
  }, [])
  const { data, reload } = useAdminRpc<Inv[]>('admin_inventory', f)
  const [sel, setSel] = useState<Inv | null>(null)
  const unit = (x: Inv, n: number) => (x.is_loose ? grams(n) : `${n} pack${n === 1 ? '' : 's'}`)
  return (
    <div>
      <PageHead title="Inventory" sub="Exact stock per item. Customers only ever see Available, Limited stock or Out of stock. Loose items are counted in grams." />
      <div className="mb-5 grid gap-3 rounded-2xl bg-white p-4 shadow-[inset_0_0_0_1px_var(--color-line)] sm:grid-cols-3">
        <Field label="Search">
          <input className="input" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        </Field>
        <Field label="Show">
          <select className="input" value={f.filter} onChange={(e) => setF({ ...f, filter: e.target.value })}>
            <option value="">Everything</option>
            <option value="low">Low or out of stock</option>
            <option value="out">Out of stock</option>
            <option value="sample">Not counted yet (sample stock)</option>
          </select>
        </Field>
      </div>
      {!data ? (
        <Loading />
      ) : data.length === 0 ? (
        <Empty>Nothing to show.</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Item</Th>
              <Th className="text-right">Stock</Th>
              <Th>Limited below</Th>
              <Th>Customers see</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {data.map((x) => (
              <tr key={x.variant_id} className={x.hidden ? 'opacity-50' : ''}>
                <Td>
                  <strong>{x.name_en}</strong> <span className="text-muted">{x.label_en}</span>
                  {x.stock_is_sample && (
                    <span className="ml-2">
                      <Badge tone="turmeric">sample count</Badge>
                    </span>
                  )}
                </Td>
                <Td className="text-right font-semibold tnum">{unit(x, x.stock)}</Td>
                <Td className="text-muted tnum">{unit(x, x.limited_level)}</Td>
                <Td>
                  <Badge tone={x.availability === 'available' ? 'leaf' : x.availability === 'limited' ? 'turmeric' : 'ink'}>{x.availability}</Badge>
                </Td>
                <Td>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSel(x)}>
                    Update stock
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <StockDialog item={sel} onClose={() => setSel(null)} onDone={reload} />
    </div>
  )
}

function StockDialog({ item, onClose, onDone }: { item: Inv | null; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction()
  const [mode, setMode] = useState<'incoming' | 'damaged' | 'expired' | 'count'>('incoming')
  const [qty, setQty] = useState('')
  const [note, setNote] = useState('')
  const [history, setHistory] = useState<{ id: number; delta: number; stock_after: number; reason: string; note: string | null; actor: string | null; created_at: string }[] | null>(null)
  useEffect(() => {
    setQty('')
    setNote('')
    setHistory(null)
    if (!item) return
    getBackend()
      .then((b) => b.rpc('admin_stock_history', { variant_id: item.variant_id }))
      .then(setHistory)
  }, [item])
  if (!item) return null
  const factor = item.is_loose ? 1000 : 1 // loose items: type kg
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const n = Math.round(Number(qty) * factor)
    if (!Number.isFinite(n) || n < 0) return
    const ok = await run(async () => {
      const b = await getBackend()
      if (mode === 'count') await b.rpc('admin_set_stock', { variant_id: item!.variant_id, stock: n, note: note || 'Stock count' })
      else await b.rpc('admin_stock_move', { variant_id: item!.variant_id, reason: mode, quantity: n, note })
      return true
    }, 'Stock updated')
    if (ok) {
      onDone()
      onClose()
    }
  }
  return (
    <Dialog open onClose={onClose} title={`${item.name_en} · ${item.label_en}`}>
      <div className="px-6 pb-6">
        <p className="text-muted">
          Now: <strong className="text-ink">{item.is_loose ? grams(item.stock) : `${item.stock} packs`}</strong>
        </p>
        <form onSubmit={submit} className="mt-4 grid gap-3">
          <div className="flex flex-wrap gap-2">
            {(['incoming', 'damaged', 'expired', 'count'] as const).map((m) => (
              <button type="button" key={m} className="chip" aria-pressed={mode === m} onClick={() => setMode(m)}>
                {m === 'incoming' ? 'New stock arrived' : m === 'count' ? 'Set counted stock' : m === 'damaged' ? 'Damaged' : 'Expired'}
              </button>
            ))}
          </div>
          <Field label={`${mode === 'count' ? 'Counted stock' : 'Quantity'} (${item.is_loose ? 'kg' : 'packs'})`}>
            <input className="input" type="number" min={0} step={item.is_loose ? 0.25 : 1} value={qty} onChange={(e) => setQty(e.target.value)} required />
          </Field>
          <Field label="Note (optional)">
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
          </Field>
          <button className="btn btn-ink w-fit" disabled={busy}>
            Save
          </button>
        </form>
        <h3 className="mt-8 font-semibold">History</h3>
        {!history ? (
          <div className="skeleton mt-2 h-20" />
        ) : history.length === 0 ? (
          <p className="mt-2 text-muted">No changes recorded yet.</p>
        ) : (
          <ul className="mt-2 max-h-64 divide-y divide-line overflow-y-auto text-[0.9rem]">
            {history.map((h) => (
              <li key={h.id} className="flex justify-between gap-2 py-1.5">
                <span>
                  <strong className={h.delta < 0 ? 'text-brand' : 'text-leaf'}>
                    {h.delta > 0 ? '+' : ''}
                    {item.is_loose ? grams(Math.abs(h.delta)).replace(/^/, h.delta < 0 ? '−' : '') : h.delta}
                  </strong>{' '}
                  {h.reason.replace('_', ' ')} {h.note && <span className="text-muted">· {h.note}</span>}
                </span>
                <span className="whitespace-nowrap text-muted">{dateTime(h.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  )
}
