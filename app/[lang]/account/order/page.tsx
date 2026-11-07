import type { Metadata } from 'next'
import { OrderPage } from '@/components/account/OrderPage'

export const metadata: Metadata = { title: 'Order', robots: { index: false } }

export default function Page() {
  return (
    <div className="wrap pt-10 sm:pt-14">
      <OrderPage />
    </div>
  )
}
