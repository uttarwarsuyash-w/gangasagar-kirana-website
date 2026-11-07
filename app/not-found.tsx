import Link from 'next/link'
import { Mark } from '@/components/brand/Mark'

// Bilingual 404 (served as 404.html by Cloudflare Pages for unknown paths).
export default function NotFound() {
  return (
    <main className="wrap grid min-h-[80vh] place-items-center py-24">
      <div className="max-w-3xl">
        <Mark className="h-16 w-16" />
        <h1 className="display-l mt-8">This shelf is empty</h1>
        <p className="display-s mt-3 text-brand" lang="hi">
          यह शेल्फ़ ख़ाली है
        </p>
        <p className="mt-6 max-w-[48ch] text-muted">The page you opened does not exist, or it moved. आपने जो पेज खोला वह मौजूद नहीं है, या हट गया है।</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/en/" className="btn btn-ink">
            Go to the homepage
          </Link>
          <Link href="/hi/" className="btn btn-ghost" lang="hi">
            होमपेज पर जाएँ
          </Link>
          <Link href="/en/shop/" className="btn btn-ghost">
            Browse the shop
          </Link>
        </div>
      </div>
    </main>
  )
}
