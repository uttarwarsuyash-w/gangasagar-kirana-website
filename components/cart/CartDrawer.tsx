'use client'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { useI18n } from '@/components/providers/I18n'
import { useCart } from '@/components/providers/Cart'
import { useLive } from '@/components/providers/Live'
import { DeliveryMeter } from './DeliveryMeter'
import { QtyStepper } from './QtyStepper'
import { ProductArt } from '@/components/product/ProductArt'
import { grams, inr } from '@/lib/format'
import { checkQuantity } from '@/lib/commerce/rules'

export function CartLines({ dense = false }: { dense?: boolean }) {
  const { t, p, lang, href, f } = useI18n()
  const cart = useCart()
  const live = useLive()
  const fees = live.settings.fees
  return (
    <ul className="divide-y divide-line">
      {cart.items.map((it) => {
        const min = it.snap.is_loose ? (it.snap.min_qty_g ?? fees.loose_min_g) : 1
        const step = it.snap.is_loose ? (it.snap.step_g ?? fees.loose_step_g) : 1
        const max = it.snap.is_loose ? (it.snap.max_qty_g ?? 100000) : 999
        const avail = live.availabilityOf(it.variant_id)
        const err = checkQuantity(it.quantity, it.snap, fees) ?? (avail === 'out' ? 'not_enough_stock' : null)
        const name = p(it.snap, 'name')
        return (
          <li key={it.variant_id} className={`flex gap-3.5 ${dense ? 'py-3' : 'py-4'}`}>
            <Link href={href(`/product/${it.product_id}/`)} className="h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-paper-2" tabIndex={-1} aria-hidden>
              <ProductArt image={it.snap.image} nameEn={it.snap.name_en} nameHi={it.snap.name_hi} colour="#B3263A" alt="" sizes="72px" />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={href(`/product/${it.product_id}/`)} className="block font-semibold leading-tight hover:text-brand">
                    {name}
                  </Link>
                  <p className="text-[0.85rem] text-muted">
                    {it.snap.is_loose ? `${inr(it.unit)} / ${t.common.kg}` : `${p(it.snap, 'label')} · ${inr(it.unit)}`}
                    {it.snap.sample && <span className="ml-1.5 text-[0.75rem]">({t.common.samplePrice})</span>}
                  </p>
                </div>
                <p className="font-semibold tnum">{inr(it.total)}</p>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <QtyStepper size="sm" value={it.quantity} isLoose={it.snap.is_loose} min={min} step={step} max={max} onChange={(v) => cart.setQty(it.variant_id, v)} label={`${t.product.quantity}: ${name}`} />
                <button className="icon-btn text-muted hover:text-brand" onClick={() => cart.remove(it.variant_id)} aria-label={f(t.cart.remove, { name })}>
                  <Trash2 className="h-[1.1rem] w-[1.1rem]" />
                </button>
              </div>
              {err && <p className="mt-1.5 text-[0.85rem] font-semibold text-brand">{t.cart.lineErrors[err as keyof typeof t.cart.lineErrors] ?? t.cart.lineErrors.bad_quantity}</p>}
              {!it.snap.is_loose && <p className="sr-only">{grams(it.weight, lang)}</p>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function BagIllustration({ fill }: { fill: number }) {
  const h = Math.max(0.04, Math.min(1, fill)) * 70
  return (
    <svg viewBox="0 0 100 110" className="h-24 w-24" aria-hidden>
      <defs>
        <clipPath id="thaili">
          <path d="M14 34 Q12 96 22 102 Q50 110 78 102 Q88 96 86 34 Z" />
        </clipPath>
      </defs>
      <path d="M14 34 Q12 96 22 102 Q50 110 78 102 Q88 96 86 34 Z" fill="#e2cfaa" />
      <g clipPath="url(#thaili)">
        <rect x="0" y={104 - h} width="100" height={h + 10} fill="var(--color-turmeric)" style={{ transition: 'all .7s cubic-bezier(.16,1,.3,1)' }} />
        <path d={`M0 ${104 - h} q12 -5 25 0 t25 0 t25 0 t25 0 v8 h-100z`} fill="#cf9520" style={{ transition: 'all .7s cubic-bezier(.16,1,.3,1)' }} />
      </g>
      <path d="M14 34 Q12 96 22 102 Q50 110 78 102 Q88 96 86 34" fill="none" stroke="var(--color-ink)" strokeWidth="2.5" />
      <path d="M10 34 Q30 26 50 34 Q70 26 90 34" fill="none" stroke="var(--color-brand)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M50 34 q-6 -16 -16 -20 M50 34 q6 -16 16 -20" fill="none" stroke="var(--color-brand)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function CartDrawer() {
  const { t, f, href, lang } = useI18n()
  const cart = useCart()
  const empty = cart.items.length === 0
  return (
    <Dialog open={cart.open} onClose={() => cart.setOpen(false)} title={t.cart.title} variant="right" closeLabel={t.nav.close}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-4 px-5 pt-2 sm:px-6">
          <BagIllustration fill={cart.weight / 5000} />
          <div>
            <p className="text-[0.95rem] text-muted">{(cart.items.length === 1 ? t.cart.itemOne : f(t.cart.items, { n: cart.items.length }))}</p>
            <p className="font-display text-3xl font-[650] tnum">{grams(cart.weight, lang)}</p>
          </div>
        </div>
        {empty ? (
          <div className="flex flex-1 flex-col items-start justify-center px-6 pb-16">
            <p className="display-s">{t.cart.empty}</p>
            <p className="mt-2 text-muted">{t.cart.emptyBody}</p>
            <Link href={href('/shop/')} className="btn btn-ink mt-6" onClick={() => cart.setOpen(false)}>
              {t.cart.browse}
            </Link>
          </div>
        ) : (
          <>
            <div className="px-5 pt-4 sm:px-6">
              <DeliveryMeter />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 sm:px-6">
              <CartLines dense />
            </div>
            <div className="border-t border-line bg-paper px-5 pb-5 pt-4 sm:px-6">
              {cart.meter.bulk && (
                <div className="mb-3 rounded-2xl bg-ink p-4 text-paper on-ink">
                  <p className="font-semibold">{t.cart.bulkTitle}</p>
                  <p className="mt-1 text-[0.9rem] text-paper/75">{t.cart.bulkBody}</p>
                </div>
              )}
              <div className="flex items-baseline justify-between">
                <span className="text-muted">{t.cart.subtotal}</span>
                <span className="font-display text-2xl font-[650] tnum">{inr(cart.subtotal)}</span>
              </div>
              <div className="mt-3 grid gap-2">
                <Link href={href('/checkout/')} className="btn btn-brand btn-lg w-full" onClick={() => cart.setOpen(false)}>
                  {cart.meter.bulk ? t.cart.retailCheckout : t.cart.checkout}
                </Link>
                {cart.meter.bulk && (
                  <Link href={`${href('/wholesale/')}?from=bag`} className="btn btn-ghost w-full" onClick={() => cart.setOpen(false)}>
                    {t.cart.requestWholesale}
                  </Link>
                )}
                <Link href={href('/cart/')} className="mt-1 text-center text-[0.9rem] underline underline-offset-4" onClick={() => cart.setOpen(false)}>
                  {t.cart.viewBag}
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </Dialog>
  )
}
