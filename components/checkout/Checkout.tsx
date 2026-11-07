'use client'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { useI18n } from '@/components/providers/I18n'
import { useCart } from '@/components/providers/Cart'
import { useLive } from '@/components/providers/Live'
import { useSession } from '@/components/providers/Session'
import { getBackend, errorCode } from '@/lib/backend'
import { grams, inr, phoneDisplay } from '@/lib/format'
import { AddressForm, EMPTY_ADDRESS, addressErrors, type AddressValue } from './AddressForm'
import { SITE } from '@/lib/site'
import { CartLines } from '@/components/cart/CartDrawer'
import { deliveryOptions, type Method, type Zone } from '@/lib/commerce/rules'

interface SavedAddress extends AddressValue {
  id: string
  label: string | null
  is_default: boolean
}

interface Quote {
  subtotal: number
  total_weight_g: number
  options: { method: Method; fee: number; available: boolean; reason: string | null }[]
  delivery_fee: number | null
  total: number
  errors: { variant_id: string; code: string }[]
  needs_quotation: boolean
  bulk: boolean
}

export function Checkout() {
  const { t, f, lang, href } = useI18n()
  const cart = useCart()
  const live = useLive()
  const session = useSession()
  const router = useRouter()
  const fees = live.settings.fees
  const [zone, setZone] = useState<Zone>('nanded')
  const [method, setMethod] = useState<Method>('delivery')
  const [pay, setPay] = useState<'cash' | 'upi_on_delivery' | 'upi_prepaid'>('cash')
  const [saved, setSaved] = useState<SavedAddress[] | null>(null)
  const [addrId, setAddrId] = useState<string | 'new'>('new')
  const [addr, setAddr] = useState<AddressValue>(EMPTY_ADDRESS)
  const [saveAddr, setSaveAddr] = useState(true)
  const [contact, setContact] = useState({ name: '', phone: '' })
  const [notes, setNotes] = useState('')
  const [optIn, setOptIn] = useState(false)
  const [terms, setTerms] = useState(false)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tried, setTried] = useState(false)

  // Load saved addresses and profile defaults once signed in.
  useEffect(() => {
    if (!session.user) return
    getBackend()
      .then((b) => b.select<SavedAddress>('addresses', 'id,label,name,phone,line1,line2,landmark,city,state,pincode,is_default', { order: ['created_at', 'desc'] }))
      .then((rows) => {
        setSaved(rows)
        const def = rows.find((r) => r.is_default) ?? rows[0]
        if (def) setAddrId(def.id)
      })
      .catch(() => setSaved([]))
  }, [session.user])
  useEffect(() => {
    if (session.profile) {
      setContact((c) => ({ name: c.name || session.profile?.full_name || '', phone: c.phone || session.profile?.phone || '' }))
      setAddr((a) => ({ ...a, name: a.name || session.profile?.full_name || '', phone: a.phone || session.profile?.phone || '' }))
      setOptIn(!!session.profile.whatsapp_opt_in)
    }
  }, [session.profile])

  useEffect(() => {
    setMethod(zone === 'nanded' ? 'delivery' : 'courier')
    setPay(zone === 'nanded' ? 'cash' : 'upi_prepaid')
  }, [zone])

  const chosenAddress: AddressValue | null = method === 'pickup' ? null : addrId === 'new' ? addr : (saved?.find((s) => s.id === addrId) ?? null)
  const pincode = method === 'delivery' && chosenAddress && /^[1-9]\d{5}$/.test(chosenAddress.pincode) ? chosenAddress.pincode : null

  // Ask the database for the authoritative totals (debounced).
  const itemsKey = JSON.stringify(cart.items.map((i) => [i.variant_id, i.quantity]))
  useEffect(() => {
    if (!cart.items.length) return
    const id = setTimeout(() => {
      getBackend()
        .then((b) => b.rpc<Quote>('quote_cart', { items: cart.items.map((i) => ({ variant_id: i.variant_id, quantity: i.quantity })), zone, method, pincode }))
        .then(setQuote)
        .catch(() => setQuote(null))
    }, 250)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, zone, method, pincode])

  // Instant (local) estimate while the database answers.
  const localOpts = useMemo(() => deliveryOptions(cart.subtotal, cart.weight, zone, fees, !pincode || live.settings.pincodes.includes(pincode)), [cart.subtotal, cart.weight, zone, fees, pincode, live.settings.pincodes])
  const opts = quote?.options ?? localOpts
  const opt = opts.find((o) => o.method === method)
  const fee = opt?.fee ?? 0
  const subtotal = quote?.subtotal ?? cart.subtotal
  const total = Number(subtotal) + Number(fee)
  const needsQuote = zone === 'outside' && (quote?.needs_quotation ?? cart.weight >= fees.bulk_threshold_g)

  async function place() {
    setTried(true)
    setError(null)
    if (!terms) return setError(t.checkout.errors.terms_not_accepted)
    if (method !== 'pickup' && addrId === 'new' && Object.keys(addressErrors(addr)).length) return setError(t.checkout.errors.bad_address)
    if (method === 'pickup' && (contact.name.trim().length < 2 || !/^[6-9]\d{9}$/.test(contact.phone))) return setError(t.checkout.errors.bad_contact)
    setBusy(true)
    try {
      const b = await getBackend()
      const payload: Record<string, unknown> = {
        items: cart.items.map((i) => ({ variant_id: i.variant_id, quantity: i.quantity })),
        zone,
        method,
        payment_method: pay,
        notes,
        accept_terms: terms,
        whatsapp_opt_in: optIn,
      }
      if (method === 'pickup') payload.contact = contact
      else if (addrId === 'new') payload.address = addr
      else payload.address_id = addrId
      const r = await b.rpc<{ id: string; number: string }>('place_order', payload)
      if (method !== 'pickup' && addrId === 'new' && saveAddr) {
        await b.insert('addresses', [{ ...addr, is_default: !saved?.length }]).catch(() => {})
      }
      b.invoke('notify', { order_id: r.id }).catch(() => {})
      cart.clear()
      router.push(`${href('/order/')}?id=${r.id}&new=1`)
    } catch (e) {
      const code = errorCode(e)
      setError(t.checkout.errors[code as keyof typeof t.checkout.errors] ?? f(t.checkout.errors.generic, { phone: phoneDisplay(SITE.phones.main) }))
    } finally {
      setBusy(false)
    }
  }

  if (!cart.items.length)
    return (
      <div className="mt-10 max-w-xl rounded-[1.75rem] border-2 border-dashed border-line p-10">
        <p className="display-s">{t.cart.empty}</p>
        <Link href={href('/shop/')} className="btn btn-ink mt-6">
          {t.cart.browse}
        </Link>
      </div>
    )

  if (!session.checked || session.loading)
    return (
      <div className="mt-10 grid gap-4 lg:grid-cols-12">
        <div className="skeleton h-96 lg:col-span-7" />
        <div className="skeleton h-72 lg:col-span-5" />
      </div>
    )

  if (!session.user)
    return (
      <div className="mt-10 max-w-xl rounded-[1.75rem] bg-paper-2 p-8">
        <h2 className="display-s">{t.checkout.signInTitle}</h2>
        <p className="mt-3 text-muted">{t.checkout.signInBody}</p>
        <button className="btn btn-ink btn-lg mt-6" onClick={() => session.signIn()}>
          <GoogleG /> {t.checkout.google}
        </button>
      </div>
    )

  const step = (n: number, title: string, children: React.ReactNode) => (
    <section className="border-t border-line py-8 first:border-t-0 first:pt-0" aria-labelledby={`step-${n}`}>
      <h2 id={`step-${n}`} className="flex items-baseline gap-3 font-display text-[1.6rem] font-[650] tracking-[-0.02em]">
        <span className="section-no">{String(n).padStart(2, '0')}</span>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  )

  const radio = (name: string, value: string, current: string, set: (v: string) => void, label: React.ReactNode, hint?: React.ReactNode, disabled?: boolean) => (
    <label className={`flex cursor-pointer items-start gap-3 rounded-2xl p-4 shadow-[inset_0_0_0_1.5px_var(--color-line)] transition has-[:checked]:shadow-[inset_0_0_0_2px_var(--color-ink)] ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-paper-2'}`}>
      <input type="radio" name={name} value={value} checked={current === value} onChange={() => set(value)} disabled={disabled} className="mt-1 h-5 w-5 accent-[var(--color-ink)]" />
      <span className="flex-1">
        <span className="block font-semibold">{label}</span>
        {hint && <span className="mt-0.5 block text-[0.9rem] text-muted">{hint}</span>}
      </span>
    </label>
  )

  return (
    <div className="mt-8 grid gap-12 lg:grid-cols-12">
      <div className="lg:col-span-7">
        {live.settings.store_mode === 'preview' && <p className="mb-6 rounded-2xl bg-brand-light p-4 font-semibold text-brand-dark">{t.checkout.testOrder}</p>}
        {step(
          1,
          t.checkout.where,
          <div className="grid gap-3 sm:grid-cols-2">
            {radio('zone', 'nanded', zone, (v) => setZone(v as Zone), t.checkout.nanded, t.checkout.nandedHint)}
            {radio('zone', 'outside', zone, (v) => setZone(v as Zone), t.checkout.outside, f(t.checkout.outsideHint, { fee: fees.outside_flat_fee }))}
          </div>,
        )}
        {step(
          2,
          t.checkout.method,
          <div className="grid gap-3 sm:grid-cols-2">
            {opts.map((o) =>
              radio(
                'method',
                o.method,
                method,
                (v) => setMethod(v as Method),
                <span className="flex justify-between gap-2">
                  {t.checkout[o.method]}
                  <span className="tnum">{o.fee === 0 ? t.checkout.free : inr(o.fee)}</span>
                </span>,
                o.reason === 'pincode_not_served' ? t.checkout.pincodeNotServed : o.method === 'pickup' ? (lang === 'hi' ? SITE.address_hi : SITE.address_en) : undefined,
                !o.available && o.reason !== 'pincode_not_served',
              ),
            )}
          </div>,
        )}
        {needsQuote ? (
          <div className="on-ink rounded-[1.5rem] p-6">
            <p className="font-semibold">{t.checkout.quoteInstead}</p>
            <Link href={`${href('/wholesale/')}?from=bag`} className="btn btn-paper mt-4">
              {t.cart.requestWholesale}
            </Link>
          </div>
        ) : (
          <>
            {step(
              3,
              method === 'pickup' ? t.checkout.contact : t.checkout.address,
              method === 'pickup' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="field">
                    <span>{t.checkout.name}</span>
                    <input className="input" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} autoComplete="name" aria-invalid={tried && contact.name.trim().length < 2 ? true : undefined} />
                  </label>
                  <label className="field">
                    <span>{t.checkout.phone}</span>
                    <input className="input" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value.replace(/\D/g, '') })} inputMode="numeric" maxLength={10} autoComplete="tel-national" aria-invalid={tried && !/^[6-9]\d{9}$/.test(contact.phone) ? true : undefined} />
                    <span className="field-hint">{t.checkout.phoneHint}</span>
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
                  {saved && saved.length > 0 && (
                    <div className="grid gap-3">
                      {saved.map((s) =>
                        radio(
                          'addr',
                          s.id,
                          addrId,
                          setAddrId,
                          <span>
                            {s.name} · {phoneDisplay(s.phone)}
                          </span>,
                          [s.line1, s.line2, s.landmark, s.city, s.pincode].filter(Boolean).join(', '),
                        ),
                      )}
                      {radio('addr', 'new', addrId, setAddrId, t.checkout.newAddress)}
                    </div>
                  )}
                  {addrId === 'new' && (
                    <div className="pt-2">
                      <AddressForm value={addr} onChange={setAddr} showErrors={tried} />
                      <label className="mt-4 flex items-center gap-3">
                        <input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} className="h-5 w-5 accent-[var(--color-ink)]" />
                        {t.checkout.saveAddress}
                      </label>
                    </div>
                  )}
                  {opt?.reason === 'pincode_not_served' && <p className="field-error">{t.checkout.pincodeNotServed}</p>}
                </div>
              ),
            )}
            {step(
              4,
              t.checkout.payment,
              zone === 'nanded' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {radio('pay', 'cash', pay, (v) => setPay(v as 'cash'), t.checkout.cash)}
                  {radio('pay', 'upi_on_delivery', pay, (v) => setPay(v as 'upi_on_delivery'), t.checkout.upiOnDelivery)}
                </div>
              ) : (
                <div className="rounded-2xl bg-paper-2 p-5">
                  <p className="flex items-center gap-2 font-semibold">
                    <Check className="h-5 w-5 text-leaf" /> {t.checkout.upiPrepaid}
                  </p>
                  <p className="mt-1 text-muted">{t.checkout.upiPrepaidBody}</p>
                  {live.settings.upi.id ? (
                    <p className="mt-3">
                      {t.checkout.upiId}: <span className="font-semibold">{live.settings.upi.id}</span>
                    </p>
                  ) : (
                    <p className="mt-3 text-[0.9rem] text-muted">{t.checkout.upiMissing}</p>
                  )}
                </div>
              ),
            )}
            <section className="border-t border-line py-8">
              <label className="field">
                <span>
                  {t.checkout.notes} <span className="font-normal text-muted">({t.common.optional})</span>
                </span>
                <textarea className="input !min-h-20" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </label>
              <label className="mt-5 flex items-start gap-3">
                <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[var(--color-ink)]" />
                <span>{t.checkout.whatsappOptIn}</span>
              </label>
              <label className="mt-3 flex items-start gap-3">
                <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[var(--color-ink)]" aria-invalid={tried && !terms ? true : undefined} required />
                <span>
                  {t.checkout.terms.split(/(\{terms\}|\{shipping\})/).map((part, i) =>
                    part === '{terms}' ? (
                      <Link key={i} href={href('/terms/')} target="_blank" className="link-u">
                        {t.checkout.termsLink}
                      </Link>
                    ) : part === '{shipping}' ? (
                      <Link key={i} href={href('/shipping/')} target="_blank" className="link-u">
                        {t.checkout.shippingLink}
                      </Link>
                    ) : (
                      part
                    ),
                  )}
                </span>
              </label>
            </section>
          </>
        )}
      </div>

      <aside className="lg:col-span-5">
        <div className="rounded-[1.75rem] bg-paper-2 p-6 lg:sticky lg:top-28">
          <h2 className="font-display text-xl font-[650]">{t.checkout.summary}</h2>
          <div className="mt-2">
            <CartLines dense />
          </div>
          <dl className="mt-4 space-y-2 border-t border-line pt-4">
            <div className="flex justify-between">
              <dt className="text-muted">{t.cart.weight}</dt>
              <dd className="tnum">{grams(quote?.total_weight_g ?? cart.weight, lang)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{t.cart.subtotal}</dt>
              <dd className="tnum">{inr(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{t.cart.delivery}</dt>
              <dd className="tnum">{fee === 0 ? t.checkout.free : inr(fee)}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <dt className="font-semibold">{t.cart.total}</dt>
              <dd className="font-display text-3xl font-[650] tnum">{inr(total)}</dd>
            </div>
          </dl>
          {error && (
            <p className="field-error mt-4" role="alert">
              {error}
            </p>
          )}
          {!needsQuote && (
            <button className="btn btn-brand btn-lg mt-5 w-full" onClick={place} disabled={busy || !!quote?.errors?.length}>
              {busy ? t.checkout.placing : `${t.checkout.place} · ${inr(total)}`}
            </button>
          )}
          <p className="mt-3 text-[0.8rem] text-muted">{t.cart.pricesChecked}</p>
        </div>
      </aside>
    </div>
  )
}

export function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  )
}
