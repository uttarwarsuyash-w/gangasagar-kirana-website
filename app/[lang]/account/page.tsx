import type { Metadata } from 'next'
import { Account } from '@/components/account/Account'

export const metadata: Metadata = { title: 'Account', robots: { index: false } }

export default function Page() {
  return (
    <div className="wrap pt-10 sm:pt-14">
      <Account />
    </div>
  )
}
