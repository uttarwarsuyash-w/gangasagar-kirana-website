'use client'
import Link from 'next/link'
import { useI18n } from '@/components/providers/I18n'
import { useCart } from '@/components/providers/Cart'
import { CartLines, BagIllustration } from './CartDrawer'
import { DeliveryMeter } from './DeliveryMeter'
import { grams, inr } from '@/lib/format'

export function CartPage() {
  const { t, f, href, lang } = useI18n()
  const cart = useCart()
  return (
    <div className="wrap pt-10 sm:pt-16">
      <div className="flex items-end gap-5">
        <BagIllustration fill={cart.weight / 5000} />
        <div>
          <h1 className="display-l">{t.cart.title}</h1>
          <p className="meta mt-2">
            {(cart.items.length === 1 ? t.cart.itemOne : f(t.cart.items, { n: cart.items.length }))} · {grams(cart.weight, lang)}
          </p>
        </div>
      </div>
      {cart.items.length === 0 ? (
        <div className="mt-12 max-w-xl rounded-[1.75rem] border-2 border-dashed border-line p-10">
          <p className="display-s">{t.cart.empty}</p>
          <p className="mt-2 text-muted">{t.cart.emptyBody}</p>
          <Link href={href('/shop/')} className="btn btn-ink mt-6">
            {t.cart.browse}
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <CartLines />
          </div>
          <aside className="lg:col-span-5">
            <div className="space-y-5 lg:sticky lg:top-28">
              <DeliveryMeter />
              {cart.meter.bulk && (
                <div className="on-ink rounded-2xl p-5">
                  <p className="font-semibold">{t.cart.bulkTitle}</p>
                  <p className="mt-1 text-paper/75">{t.cart.bulkBody}</p>
                </div>
              )}
              <div className="rounded-2xl border border-line p-5">
                <div className="flex justify-between">
                  <span className="text-muted">{t.cart.weight}</span>
                  <span className="tnum">{grams(cart.weight, lang)}</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-muted">{t.cart.subtotal}</span>
                  <span className="font-display text-3xl font-[650] tnum">{inr(cart.subtotal)}</span>
                </div>
                <p className="mt-3 text-[0.85rem] text-muted">{t.cart.pricesChecked}</p>
                <div className="mt-5 grid gap-2">
                  <Link href={href('/checkout/')} className="btn btn-brand btn-lg">
                    {cart.meter.bulk ? t.cart.retailCheckout : t.cart.checkout}
                  </Link>
                  {cart.meter.bulk && (
                    <Link href={`${href('/wholesale/')}?from=bag`} className="btn btn-ghost">
                      {t.cart.requestWholesale}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
