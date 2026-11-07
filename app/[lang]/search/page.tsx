import type { Metadata } from 'next'
import { getCatalogue } from '@/lib/catalogue'
import { getDict, type Lang } from '@/lib/i18n'
import { ShopBrowser } from '@/components/product/ShopBrowser'

export const metadata: Metadata = { title: 'Search', robots: { index: false } }

export default async function SearchPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = (await params) as { lang: Lang }
  const t = getDict(lang)
  const { products, categories } = await getCatalogue()
  return (
    <div className="wrap pt-10 sm:pt-16">
      <h1 className="display-l mb-10">{t.search.title}</h1>
      {/* ShopBrowser reads ?q= from the address bar */}
      <ShopBrowser products={products} categories={categories} />
    </div>
  )
}
