'use client'
import Link from 'next/link'
import { useAdminRpc, PageHead, Stat, Panel, Badge, Loading, Empty } from '../ui'
import { BarChart } from '../BarChart'
import { inr, dateTime, grams } from '@/lib/format'
import type { Order } from '@/components/account/OrderView'

interface Dash {
  sales_today: number
  sales_week: number
  sales_month: number
  orders_today: number
  pending_orders: number
  completed_orders: number
  test_orders: number
  new_orders: number
  payments_to_verify: number
  cancel_requests: number
  new_enquiries: number
  quotation_requests: number
  pending_reviews: number
  sample_prices: number
  placeholder_photos: number
  store_mode: string
  low_stock: { variant_id: string; name_en: string; label_en: string; availability: string; stock: number; is_loose: boolean }[]
  recent_orders: Order[]
  activity: { id: number; actor: string; action: string; entity: string; entity_id: string; created_at: string; detail: { changed?: string[]; name?: string } }[]
  series: { day: string; total: number }[]
}

export function Overview() {
  const { data: d } = useAdminRpc<Dash>('admin_dashboard')
  if (!d) return <Loading />
  const todo = [
    d.new_orders && { href: '/admin/orders/?status=Order%20Placed', text: `${d.new_orders} new order${d.new_orders > 1 ? 's' : ''} to confirm` },
    d.payments_to_verify && { href: '/admin/orders/?payment=pending_verification', text: `${d.payments_to_verify} UPI payment${d.payments_to_verify > 1 ? 's' : ''} to check` },
    d.cancel_requests && { href: '/admin/orders/?cancel=1', text: `${d.cancel_requests} cancellation request${d.cancel_requests > 1 ? 's' : ''}` },
    d.quotation_requests && { href: '/admin/quotations/', text: `${d.quotation_requests} wholesale quotation${d.quotation_requests > 1 ? 's' : ''} to price` },
    d.new_enquiries && { href: '/admin/enquiries/', text: `${d.new_enquiries} enquir${d.new_enquiries > 1 ? 'ies' : 'y'} waiting` },
    d.pending_reviews && { href: '/admin/reviews/', text: `${d.pending_reviews} review${d.pending_reviews > 1 ? 's' : ''} to approve` },
  ].filter(Boolean) as { href: string; text: string }[]
  return (
    <div>
      <PageHead
        title="Overview"
        sub={d.store_mode === 'preview' ? 'The store is in preview mode: orders are test orders and prices are marked as samples.' : 'The store is live.'}
        actions={
          <>
            <Link href="/admin/products/" className="btn btn-ghost btn-sm">
              Update prices
            </Link>
            <Link href="/admin/orders/" className="btn btn-ink btn-sm">
              Open orders
            </Link>
          </>
        }
      />
      {todo.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {todo.map((x) => (
            <Link key={x.href} href={x.href} className="rounded-full bg-brand px-4 py-2 text-[0.9rem] font-semibold text-white hover:bg-brand-dark">
              {x.text}
            </Link>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Sales today" value={inr(d.sales_today)} hint={`${d.orders_today} orders`} />
        <Stat label="Last 7 days" value={inr(d.sales_week)} />
        <Stat label="This month" value={inr(d.sales_month)} />
        <Stat label="Open orders" value={d.pending_orders} hint={`${d.completed_orders} delivered`} tone={d.pending_orders ? 'brand' : undefined} />
      </div>
      {d.test_orders > 0 && <p className="mt-3 text-[0.85rem] text-muted">Sales exclude {d.test_orders} test order(s) placed in preview mode.</p>}
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Sales, last 14 days" className="xl:col-span-2">
          {d.series.every((s) => !Number(s.total)) ? (
            <Empty>No sales in the last 14 days yet. Test orders are not counted.</Empty>
          ) : (
            <BarChart label="Sales per day, last 14 days" data={d.series.map((s) => ({ x: new Date(s.day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), y: Number(s.total) }))} format={(n) => inr(Math.round(n))} />
          )}
        </Panel>
        <Panel title="Before going live">
          <ul className="space-y-3 text-[0.95rem]">
            <li className="flex justify-between gap-3">
              <span>Products with sample prices</span>
              <Badge tone={d.sample_prices ? 'turmeric' : 'leaf'}>{d.sample_prices}</Badge>
            </li>
            <li className="flex justify-between gap-3">
              <span>Placeholder photos</span>
              <Badge tone={d.placeholder_photos ? 'turmeric' : 'leaf'}>{d.placeholder_photos}</Badge>
            </li>
          </ul>
          <Link href="/admin/publish/" className="btn btn-ghost btn-sm mt-5">
            Go-live checklist
          </Link>
        </Panel>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Recent orders" className="xl:col-span-2" actions={<Link href="/admin/orders/" className="text-[0.9rem] underline">All orders</Link>}>
          {d.recent_orders.length === 0 ? (
            <Empty>No orders yet. Orders appear here as soon as customers place them.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {d.recent_orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/view/?id=${o.id}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5 hover:text-brand">
                    <span className="font-semibold tnum">{o.number}</span>
                    <span className="text-muted">{o.customer_name}</span>
                    <Badge tone={o.status === 'Order Placed' ? 'brand' : 'neutral'}>{o.status}</Badge>
                    <span className="tnum">{inr(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Low stock" actions={<Link href="/admin/inventory/?filter=low" className="text-[0.9rem] underline">Inventory</Link>}>
          {d.low_stock.length === 0 ? (
            <p className="text-muted">Everything is in stock.</p>
          ) : (
            <ul className="space-y-2 text-[0.92rem]">
              {d.low_stock.map((x) => (
                <li key={x.variant_id} className="flex justify-between gap-2">
                  <span>
                    {x.name_en} <span className="text-muted">{x.label_en}</span>
                  </span>
                  <Badge tone={x.availability === 'out' ? 'ink' : 'turmeric'}>{x.is_loose ? grams(x.stock) : x.stock}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <Panel title="Recent activity" className="mt-6">
        {d.activity.length === 0 ? (
          <p className="text-muted">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-line text-[0.9rem]">
            {d.activity.map((a) => (
              <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  <span className="font-semibold">{a.actor.split('@')[0]}</span> {a.action}d {a.entity.replace(/_/g, ' ')} <span className="text-muted">{a.detail?.name ?? a.entity_id}</span>
                  {a.detail?.changed && <span className="text-muted"> ({a.detail.changed.join(', ')})</span>}
                </span>
                <span className="text-muted">{dateTime(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
