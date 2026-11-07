'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useI18n } from '@/components/providers/I18n'
import { useSession } from '@/components/providers/Session'
import { useToast } from '@/components/ui/Toast'
import { getBackend, errorCode } from '@/lib/backend'
import { dateShort, grams, inr, phoneDisplay } from '@/lib/format'
import { AddressForm, EMPTY_ADDRESS, addressErrors, type AddressValue } from '@/components/checkout/AddressForm'
import { GoogleG } from '@/components/checkout/Checkout'
import { Quotations } from './Quotations'
import type { Order } from './OrderView'

const TABS = ['orders', 'quotations', 'addresses', 'wishlist', 'enquiries', 'reviews', 'profile'] as const
type Tab = (typeof TABS)[number]

export function Account() {
  const { t, f, href } = useI18n()
  const session = useSession()
  const [tab, setTab] = useState<Tab>('orders')

  useEffect(() => {
    const q = new URLSearchParams(location.search).get('tab') as Tab | null
    if (q && TABS.includes(q)) setTab(q)
  }, [])
  const go = (x: Tab) => {
    setTab(x)
    history.replaceState(history.state, '', `?tab=${x}`)
  }

  if (!session.checked || session.loading) return <div className="skeleton mt-10 h-96" />
  if (!session.user)
    return (
      <div className="mt-10 max-w-xl rounded-[1.75rem] bg-paper-2 p-8">
        <h2 className="display-s">{t.auth.title}</h2>
        <p className="mt-3 text-muted">{t.auth.body}</p>
        <button className="btn btn-ink btn-lg mt-6" onClick={() => session.signIn()}>
          <GoogleG /> {t.auth.google}
        </button>
      </div>
    )

  const name = session.profile?.full_name || session.user.name || session.user.email
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="hand text-[1.3rem] text-brand">{f(t.account.hello, { name: (name ?? '').split(' ')[0] })}</p>
          <h1 className="display-l">{t.account.title}</h1>
          <p className="meta mt-2 !normal-case">{session.user.email}</p>
        </div>
        <div className="flex gap-2">
          {session.profile?.is_admin && (
            <a href="/admin/" className="btn btn-ink btn-sm">
              {t.account.adminLink}
            </a>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => session.signOut()}>
            {t.account.signOut}
          </button>
        </div>
      </div>
      <div role="tablist" aria-label={t.account.title} className="no-scrollbar -mx-[clamp(1.125rem,4vw,3.5rem)] mt-8 flex gap-2 overflow-x-auto border-b border-line px-[clamp(1.125rem,4vw,3.5rem)] pb-3">
        {TABS.map((x) => (
          <button key={x} role="tab" aria-selected={tab === x} className="chip shrink-0" onClick={() => go(x)}>
            {t.account[x]}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="pt-8">
        {tab === 'orders' && <Orders />}
        {tab === 'quotations' && <Quotations />}
        {tab === 'addresses' && <Addresses />}
        {tab === 'wishlist' && <Wishlist />}
        {tab === 'enquiries' && <Enquiries />}
        {tab === 'reviews' && <MyReviews />}
        {tab === 'profile' && <Profile />}
      </div>
      <p className="mt-16 text-muted">
        <Link href={href('/faq/')} className="link-u">
          {t.nav.faq}
        </Link>
      </p>
    </div>
  )
}

function useRpc<T>(fn: string, p: object = {}) {
  const [data, setData] = useState<T | null>(null)
  const load = useCallback(() => {
    getBackend()
      .then((b) => b.rpc<T>(fn, p))
      .then(setData)
      .catch(() => setData([] as unknown as T))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fn])
  useEffect(load, [load])
  return [data, load] as const
}

function Empty({ title, body, cta }: { title: string; body?: string; cta?: React.ReactNode }) {
  return (
    <div className="max-w-xl rounded-[1.75rem] border-2 border-dashed border-line p-8">
      <p className="display-s">{title}</p>
      {body && <p className="mt-2 text-muted">{body}</p>}
      {cta}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const { t } = useI18n()
  const tone = status === 'Delivered' ? 'bg-leaf-light text-leaf' : status === 'Cancelled' ? 'bg-ink/8 text-ink' : 'bg-brand-light text-brand-dark'
  return <span className={`rounded-full px-3 py-1 text-[0.8rem] font-semibold ${tone}`}>{t.order.statuses[status as keyof typeof t.order.statuses] ?? status}</span>
}

function Orders() {
  const { t, lang, href, f } = useI18n()
  const [orders] = useRpc<(Order & { item_count: number })[]>('my_orders')
  if (!orders) return <div className="skeleton h-40" />
  if (!orders.length)
    return (
      <Empty
        title={t.account.noOrders}
        body={t.account.noOrdersBody}
        cta={
          <Link href={href('/shop/')} className="btn btn-ink mt-6">
            {t.cart.browse}
          </Link>
        }
      />
    )
  return (
    <ul className="divide-y divide-line border-y border-line">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`${href('/account/order/')}?id=${o.id}`} className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-5 sm:grid-cols-[10rem_1fr_auto_auto]">
            <span className="font-display text-xl font-[650] tnum group-hover:text-brand">{o.number}</span>
            <span className="text-muted sm:order-none">
              {f(t.order.placedOn, { date: dateShort(o.created_at, lang) })} · {o.item_count} · {t.order.methods[o.method]}
            </span>
            <StatusPill status={o.status} />
            <span className="text-right font-semibold tnum">{inr(o.total)}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

interface Addr extends AddressValue {
  id: string
  is_default: boolean
}

function Addresses() {
  const { t } = useI18n()
  const toast = useToast()
  const [list, setList] = useState<Addr[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<AddressValue>(EMPTY_ADDRESS)
  const [tried, setTried] = useState(false)
  const load = useCallback(() => {
    getBackend()
      .then((b) => b.select<Addr>('addresses', 'id,name,phone,line1,line2,landmark,city,state,pincode,is_default', { order: ['created_at', 'desc'] }))
      .then(setList)
      .catch(() => setList([]))
  }, [])
  useEffect(load, [load])
  async function save(e: React.FormEvent) {
    e.preventDefault()
    setTried(true)
    if (Object.keys(addressErrors(draft)).length) return
    try {
      const b = await getBackend()
      await b.insert('addresses', [{ ...draft, is_default: !list?.length }])
      setAdding(false)
      setDraft(EMPTY_ADDRESS)
      setTried(false)
      toast(t.common.saved)
      load()
    } catch (x) {
      toast(errorCode(x), 'error')
    }
  }
  async function del(id: string) {
    if (!confirmInline(t.account.confirmDelete)) return
    const b = await getBackend()
    await b.remove('addresses', { eq: { id } })
    load()
  }
  async function makeDefault(id: string) {
    const b = await getBackend()
    await b.update('addresses', { is_default: true }, { eq: { id } })
    load()
  }
  if (!list) return <div className="skeleton h-40" />
  return (
    <div className="max-w-3xl">
      {list.length === 0 && !adding && <Empty title={t.account.noAddresses} />}
      <ul className="grid gap-3 sm:grid-cols-2">
        {list.map((a) => (
          <li key={a.id} className="rounded-[1.4rem] border border-line p-5">
            <p className="font-semibold">
              {a.name} {a.is_default && <span className="ml-2 rounded-full bg-ink px-2 py-0.5 text-[0.75rem] text-paper">{t.account.default}</span>}
            </p>
            <p className="mt-1 text-[0.95rem] text-muted">{[a.line1, a.line2, a.landmark, a.city, a.pincode].filter(Boolean).join(', ')}</p>
            <p className="text-[0.95rem] text-muted">{phoneDisplay(a.phone)}</p>
            <div className="mt-3 flex gap-2">
              {!a.is_default && (
                <button className="btn btn-ghost btn-sm" onClick={() => makeDefault(a.id)}>
                  {t.account.makeDefault}
                </button>
              )}
              <button className="icon-btn text-muted hover:text-brand" onClick={() => del(a.id)} aria-label={t.account.deleteAddress}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      {adding ? (
        <form onSubmit={save} className="mt-6 rounded-[1.4rem] bg-paper-2 p-5">
          <AddressForm value={draft} onChange={setDraft} showErrors={tried} idPrefix="acc" />
          <div className="mt-5 flex gap-2">
            <button className="btn btn-ink">{t.common.save}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>
              {t.common.cancel}
            </button>
          </div>
        </form>
      ) : (
        <button className="btn btn-ink mt-6" onClick={() => setAdding(true)}>
          {t.account.addAddress}
        </button>
      )}
    </div>
  )
}

/** Inline confirm without window.confirm (blocked in some frames); asks twice on a double tap. */
let pending: string | null = null
function confirmInline(msg: string) {
  if (pending === msg) {
    pending = null
    return true
  }
  pending = msg
  setTimeout(() => (pending = null), 4000)
  try {
    return window.confirm(msg)
  } catch {
    return false
  }
}

function Wishlist() {
  const { t, p, href } = useI18n()
  const [rows, setRows] = useState<{ product_id: string }[] | null>(null)
  const [names, setNames] = useState<Record<string, { name_en: string; name_hi: string }>>({})
  const load = useCallback(() => {
    getBackend()
      .then(async (b) => {
        const w = await b.select<{ product_id: string }>('wishlist', 'product_id', { order: ['created_at', 'desc'] })
        setRows(w)
        if (w.length) {
          const prods = await b.select<{ id: string; name_en: string; name_hi: string }>('products', 'id,name_en,name_hi', { in: ['id', w.map((x) => x.product_id)] })
          setNames(Object.fromEntries(prods.map((x) => [x.id, x])))
        }
      })
      .catch(() => setRows([]))
  }, [])
  useEffect(load, [load])
  if (!rows) return <div className="skeleton h-40" />
  if (!rows.length) return <Empty title={t.account.noWishlist} />
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((r) => (
        <li key={r.product_id} className="flex items-center justify-between rounded-[1.4rem] border border-line p-4">
          <Link href={href(`/product/${r.product_id}/`)} className="font-semibold hover:text-brand">
            {names[r.product_id] ? p(names[r.product_id], 'name') : r.product_id}
          </Link>
          <button
            className="icon-btn text-muted hover:text-brand"
            aria-label={t.product.wishlistRemove}
            onClick={async () => {
              const b = await getBackend()
              await b.remove('wishlist', { eq: { product_id: r.product_id } })
              load()
            }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  )
}

function Enquiries() {
  const { t, lang } = useI18n()
  const [rows] = useRpc<{ id: string; kind: string; message: string | null; quantity_g: number | null; status: 'pending' | 'resolved'; created_at: string }[]>('my_enquiries')
  if (!rows) return <div className="skeleton h-40" />
  if (!rows.length) return <Empty title={t.account.noEnquiries} />
  return (
    <ul className="divide-y divide-line border-y border-line">
      {rows.map((e) => (
        <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
          <span>
            <span className="font-semibold">{e.message || (e.quantity_g ? grams(e.quantity_g, lang) : e.kind)}</span>
            <span className="block text-[0.85rem] text-muted">{dateShort(e.created_at, lang)}</span>
          </span>
          <span className={`rounded-full px-3 py-1 text-[0.8rem] font-semibold ${e.status === 'resolved' ? 'bg-leaf-light text-leaf' : 'bg-turmeric/20'}`}>{t.account.status[e.status]}</span>
        </li>
      ))}
    </ul>
  )
}

function MyReviews() {
  const { t, lang, p, href } = useI18n()
  const [rows] = useRpc<{ id: string; product_id: string; name_en: string; name_hi: string; rating: number; body: string | null; status: 'pending' | 'approved' | 'rejected'; at: string }[]>('my_reviews')
  if (!rows) return <div className="skeleton h-40" />
  if (!rows.length) return <Empty title={t.account.noReviews} />
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {rows.map((r) => (
        <li key={r.id} className="rounded-[1.4rem] border border-line p-5">
          <Link href={href(`/product/${r.product_id}/`)} className="font-semibold hover:text-brand">
            {p(r, 'name')}
          </Link>
          <p className="mt-1">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
          {r.body && <p className="mt-2 text-muted">{r.body}</p>}
          <p className="mt-3 text-[0.85rem]">
            {dateShort(r.at, lang)} · <span className="font-semibold">{t.account.status[r.status === 'pending' ? 'pending' : r.status]}</span>
          </p>
        </li>
      ))}
    </ul>
  )
}

function Profile() {
  const { t } = useI18n()
  const session = useSession()
  const toast = useToast()
  const [name, setName] = useState(session.profile?.full_name ?? '')
  const [phone, setPhone] = useState(session.profile?.phone ?? '')
  const [opt, setOpt] = useState(!!session.profile?.whatsapp_opt_in)
  async function save(e: React.FormEvent) {
    e.preventDefault()
    try {
      const b = await getBackend()
      await b.rpc('update_profile', { full_name: name, phone, whatsapp_opt_in: opt })
      await session.refreshProfile()
      toast(t.common.saved)
    } catch (x) {
      toast(errorCode(x) === 'bad_phone' ? t.contact.errors.bad_phone : errorCode(x), 'error')
    }
  }
  return (
    <form onSubmit={save} className="grid max-w-xl gap-5">
      <label className="field">
        <span>{t.checkout.name}</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
      </label>
      <label className="field">
        <span>{t.checkout.phone}</span>
        <input className="input" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={10} autoComplete="tel-national" />
        <span className="field-hint">{t.checkout.phoneHint}</span>
      </label>
      <div className="rounded-[1.4rem] bg-paper-2 p-5">
        <p className="font-semibold">{t.account.promotions}</p>
        <p className="mt-1 text-[0.95rem] text-muted">{t.account.promotionsBody}</p>
        <label className="mt-4 flex items-center gap-3">
          <input type="checkbox" role="switch" checked={opt} onChange={(e) => setOpt(e.target.checked)} className="h-5 w-5 accent-[var(--color-ink)]" />
          <span className="font-medium">{opt ? t.account.promotionsOn : t.account.promotionsOff}</span>
        </label>
      </div>
      <button className="btn btn-ink w-fit">{t.common.save}</button>
    </form>
  )
}
