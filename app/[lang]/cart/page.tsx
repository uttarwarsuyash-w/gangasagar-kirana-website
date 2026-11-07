import type { Metadata } from 'next'
import { CartPage } from '@/components/cart/CartPage'

export const metadata: Metadata = { title: 'Bag', robots: { index: false } }

export default function Cart() {
  return <CartPage />
}
