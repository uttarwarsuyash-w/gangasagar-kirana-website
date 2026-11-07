'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getBackend } from '@/lib/backend'
import { IS_DEMO } from '@/lib/backend/config'
import { dateTime, grams, inr } from '@/lib/format'
import { BarChart } from '../BarChart'
import { useAdminRpc, useAction, PageHead, Stat, Panel, Loading, Empty, Field, Badge, download } from '../ui'

interface Report {
  from: string
  to: string
  orders: number
  revenue: number
  delivery_fees: number
  average_order: number
  customers: number
  new_customers: number
  cancelled: number
  retail: { orders: number; revenue: number }
  wholesale: { orders: number; revenue: number }
  by_zone: Record<string, number>
  by_payment: Record<string, number>
  by_day: { day: string; orders: number; revenue: number }[]
  top_products: { product_id: string; name_en: string; revenue: number; weight_g: number; lines: number }[]
  inventory: { variants: number; out: number; limited: number }
}

const iso = (d: Date) => d.toISOString().slice(0, 10)

export function ReportsAdmin() {
  const [range, setRange] = useState({ from: iso(new Date(Date.now() - 29 * 86400000)), to: iso(new Date()) })
  const { data: r } = useAdminRpc<Report>('admin_report', range)
  const { run } = useAction()
  const preset = (days: number) => setRange({ from: iso(new Date(Date.now() - (days - 1) * 86400000)), to: iso(new Date()) })

  async function excel() {
    if (!r) return
    await run(async () => {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      const s = wb.addWorksheet('Summary')
      s.addRows([
        ['Gangasagar Kirana Stores: report', `${r.from} to ${r.to}`],
        [],
        ['Orders', r.orders],
        ['Revenue (Rs)', Number(r.revenue)],
        ['Delivery fees (Rs)', Number(r.delivery_fees)],
        ['Average order (Rs)', Number(r.average_order)],
        ['Customers who ordered', r.customers],
        ['New customers', r.new_customers],
        ['Cancelled orders', r.cancelled],
        ['Retail orders', r.retail.orders, 'Retail revenue', Number(r.retail.revenue)],
        ['Wholesale orders', r.wholesale.orders, 'Wholesale revenue', Number(r.wholesale.revenue)],
        ['Items out of stock', r.inventory.out, 'Limited stock', r.inventory.limited],
      ])
      s.getColumn(1).width = 28
      s.getColumn(3).width = 20
      const d = wb.addWorksheet('By day')
      d.addRow(['Day', 'Orders', 'Revenue (Rs)'])
      r.by_day.forEach((x) => d.addRow([x.day, x.orders, Number(x.revenue)]))
      const p = wb.addWorksheet('Top products')
      p.addRow(['Product', 'Revenue (Rs)', 'Weight (kg)', 'Order lines'])
      r.top_products.forEach((x) => p.addRow([x.name_en, Number(x.revenue), Number(x.weight_g) / 1000, x.lines]))
      p.getColumn(1).width = 30
      download(`gangasagar-report-${r.from}-to-${r.to}.xlsx`, await wb.xlsx.writeBuffer(), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    }, 'Excel report downloaded')
  }

  async function pdf() {
    if (!r) return
    await run(async () => {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
      const doc = await PDFDocument.create()
      const page = doc.addPage([595.28, 841.89])
      const f = await doc.embedFont(StandardFonts.Helvetica)
      const b = await doc.embedFont(StandardFonts.HelveticaBold)
      let y = 790
      const line = (t: string, bold = false, size = 11) => {
        page.drawText(t, { x: 50, y, size, font: bold ? b : f, color: rgb(0.12, 0.1, 0.09) })
        y -= size + 8
      }
      const rs = (n: number) => `Rs. ${Number(n).toLocaleString('en-IN')}`
      line('Gangasagar Kirana Stores: sales report', true, 16)
      line(`${r.from} to ${r.to}`)
      y -= 8
      line(`Orders: ${r.orders}    Revenue: ${rs(r.revenue)}    Average order: ${rs(r.average_order)}`)
      line(`Delivery fees: ${rs(r.delivery_fees)}    Cancelled: ${r.cancelled}`)
      line(`Customers who ordered: ${r.customers}    New customers: ${r.new_customers}`)
      line(`Retail: ${r.retail.orders} orders, ${rs(r.retail.revenue)}    Wholesale: ${r.wholesale.orders} orders, ${rs(r.wholesale.revenue)}`)
      line(`Inventory: ${r.inventory.out} out of stock, ${r.inventory.limited} limited`)
      y -= 10
      line('Top products', true, 13)
      r.top_products.slice(0, 15).forEach((x, i) => line(`${i + 1}. ${x.name_en}: ${rs(x.revenue)} (${(Number(x.weight_g) / 1000).toFixed(1)} kg)`))
      y -= 10
      line('Revenue by day', true, 13)
      r.by_day.filter((x) => Number(x.revenue) > 0).slice(-25).forEach((x) => line(`${x.day}: ${x.orders} orders, ${rs(x.revenue)}`, false, 10))
      download(`gangasagar-report-${r.from}-to-${r.to}.pdf`, (await doc.save()) as BlobPart, 'application/pdf')
    }, 'PDF report downloaded')
  }

  return (
    <div>
      <PageHead
        title="Reports"
        sub="Real orders only: test orders (preview mode) and cancelled orders are left out."
        actions={
          <>
            <button className="btn btn-ghost btn-sm" onClick={excel} disabled={!r}>
              Export to Excel
            </button>
            <button className="btn btn-ghost btn-sm" onClick={pdf} disabled={!r}>
              Export to PDF
            </button>
          </>
        }
      />
      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-[inset_0_0_0_1px_var(--color-line)]">
        <Field label="From">
          <input type="date" className="input" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        </Field>
        <Field label="To">
          <input type="date" className="input" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        </Field>
        {[7, 30, 90, 365].map((d) => (
          <button key={d} className="chip" onClick={() => preset(d)}>
            Last {d} days
          </button>
        ))}
      </div>
      {!r ? (
        <Loading />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Revenue" value={inr(r.revenue)} hint={`${r.orders} orders`} />
            <Stat label="Average order" value={inr(r.average_order)} />
            <Stat label="Customers who ordered" value={r.customers} hint={`${r.new_customers} new sign-ups`} />
            <Stat label="Cancelled" value={r.cancelled} />
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Panel title="Revenue per day" className="xl:col-span-2">
              {r.orders === 0 ? <Empty>No real orders in this period yet.</Empty> : <BarChart label="Revenue per day" data={r.by_day.map((d) => ({ x: new Date(d.day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), y: Number(d.revenue) }))} format={(n) => inr(Math.round(n))} />}
            </Panel>
            <Panel title="Retail and wholesale">
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt>Retail</dt>
                  <dd className="text-right tnum">
                    {inr(r.retail.revenue)}
                    <span className="block text-[0.85rem] text-muted">{r.retail.orders} orders</span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Wholesale (quotations)</dt>
                  <dd className="text-right tnum">
                    {inr(r.wholesale.revenue)}
                    <span className="block text-[0.85rem] text-muted">{r.wholesale.orders} orders</span>
                  </dd>
                </div>
                <div className="flex justify-between border-t border-line pt-3">
                  <dt>Delivery fees collected</dt>
                  <dd className="tnum">{inr(r.delivery_fees)}</dd>
                </div>
                <div className="border-t border-line pt-3 text-[0.9rem]">
                  <p className="text-muted">By area</p>
                  {Object.entries(r.by_zone).map(([k, v]) => (
                    <p key={k} className="flex justify-between">
                      <span>{k === 'nanded' ? 'Nanded' : 'Outside Nanded'}</span>
                      <span className="tnum">{v}</span>
                    </p>
                  ))}
                  <p className="mt-2 text-muted">By payment</p>
                  {Object.entries(r.by_payment).map(([k, v]) => (
                    <p key={k} className="flex justify-between">
                      <span>{k.replace(/_/g, ' ')}</span>
                      <span className="tnum">{v}</span>
                    </p>
                  ))}
                </div>
              </dl>
            </Panel>
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Panel title="Top products" className="xl:col-span-2">
              {r.top_products.length === 0 ? (
                <Empty>No sales yet.</Empty>
              ) : (
                <ol className="divide-y divide-line">
                  {r.top_products.map((p, i) => (
                    <li key={p.product_id} className="flex justify-between gap-3 py-2">
                      <span>
                        {i + 1}. {p.name_en} <span className="text-muted">· {grams(Number(p.weight_g))}</span>
                      </span>
                      <span className="font-semibold tnum">{inr(p.revenue)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
            <Panel title="Inventory now">
              <p className="flex justify-between">
                <span>Items for sale</span>
                <span className="tnum">{r.inventory.variants}</span>
              </p>
              <p className="flex justify-between">
                <span>Out of stock</span>
                <Badge tone={r.inventory.out ? 'ink' : 'leaf'}>{r.inventory.out}</Badge>
              </p>
              <p className="flex justify-between">
                <span>Limited stock</span>
                <Badge tone={r.inventory.limited ? 'turmeric' : 'leaf'}>{r.inventory.limited}</Badge>
              </p>
              <Link href="/admin/inventory/?filter=low" className="btn btn-ghost btn-sm mt-4">
                Open inventory
              </Link>
            </Panel>
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Publish & go live
export function PublishAdmin() {
  const { data: left, reload } = useAdminRpc<{ product_id: string; name_en: string; variants: number }[]>('admin_go_live_check')
  const { data: dash, reload: reloadDash } = useAdminRpc<{ store_mode: string; placeholder_photos: number }>('admin_dashboard')
  const [lastPublish, setLastPublish] = useState<{ at: string; by: string } | null>(null)
  const reloadLast = () =>
    getBackend()
      .then((b) => b.select<{ value: { at: string; by: string } }>('settings', 'value', { eq: { key: 'last_publish' } }))
      .then((r) => r[0] && setLastPublish(r[0].value))
      .catch(() => {})
  useEffect(() => {
    reloadLast()
  }, [])
  const { busy, run } = useAction()

  async function publish() {
    const r = await run(async () => {
      const b = await getBackend()
      return b.invoke('publish', {})
    }, IS_DEMO ? 'Demo: on the real site this rebuilds the pages (about 2 to 4 minutes).' : 'Publishing started. The website updates in about 2 to 4 minutes.')
    if (r) reloadLast()
  }
  async function mode(m: 'live' | 'preview') {
    await run(async () => {
      const b = await getBackend()
      await b.rpc('admin_set_store_mode', { mode: m })
      reload()
      reloadDash()
    }, m === 'live' ? 'The store is live. Press Publish so search engines can find it.' : 'Back in preview mode')
  }
  const isLive = dash?.store_mode === 'live'
  return (
    <div>
      <PageHead title="Publish and go live" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Publish the website">
          <p className="text-muted">Prices, stock, orders and offers update on the website at once. New products, text changes, blog posts, policy pages and business details need a Publish, which rebuilds the pages.</p>
          <button className="btn btn-brand btn-lg mt-5" onClick={publish} disabled={busy}>
            Publish now
          </button>
          {lastPublish && <p className="mt-3 text-[0.9rem] text-muted">Last published {dateTime(lastPublish.at)} by {lastPublish.by}.</p>}
          {IS_DEMO && <p className="mt-3 text-[0.85rem] text-turmeric-dark">Demo mode: publishing works after the Cloudflare deploy hook is set up (SETUP.md step 6).</p>}
        </Panel>
        <Panel title="Store mode" actions={<Badge tone={isLive ? 'leaf' : 'turmeric'}>{isLive ? 'Live' : 'Preview'}</Badge>}>
          <p className="text-muted">In preview mode the site shows a banner, search engines are asked not to index it, and every order is a test order.</p>
          {!left ? (
            <Loading />
          ) : left.length > 0 ? (
            <>
              <p className="mt-4 font-semibold">
                {left.length} product(s) still have sample prices. Verify their prices or hide them to go live:
              </p>
              <ul className="mt-2 max-h-72 overflow-y-auto rounded-xl bg-paper-2 p-3 text-[0.9rem]">
                {left.map((p) => (
                  <li key={p.product_id} className="flex justify-between py-0.5">
                    <Link href={`/admin/products/edit/?id=${p.product_id}`} className="underline">
                      {p.name_en}
                    </Link>
                    <span className="text-muted">{p.variants} price(s)</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[0.9rem] text-muted">Fastest way: Products → Export to Excel, fix prices, set price_is_sample to “no”, Import.</p>
            </>
          ) : (
            <p className="mt-4 font-semibold text-leaf">All visible products have checked prices.</p>
          )}
          {dash && dash.placeholder_photos > 0 && <p className="mt-3 text-[0.9rem]">{dash.placeholder_photos} product(s) still use the kraft-pouch illustration. That is allowed, but real photos sell better.</p>}
          <div className="mt-5 flex gap-2">
            {isLive ? (
              <button className="btn btn-ghost" onClick={() => mode('preview')} disabled={busy}>
                Back to preview mode
              </button>
            ) : (
              <button className="btn btn-brand" onClick={() => mode('live')} disabled={busy || !left || left.length > 0}>
                Go live
              </button>
            )}
          </div>
        </Panel>
      </div>
    </div>
  )
}
