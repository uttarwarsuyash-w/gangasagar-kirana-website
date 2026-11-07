import type { Metadata } from 'next'
import { getDict, type Lang } from '@/lib/i18n'
import { Checkout } from '@/components/checkout/Checkout'

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } }

export default async function CheckoutPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = (await params) as { lang: Lang }
  const t = getDict(lang)
  return (
    <div className="wrap pt-10 sm:pt-14">
      <h1 className="display-l">{t.checkout.title}</h1>
      <Checkout />
    </div>
  )
}
