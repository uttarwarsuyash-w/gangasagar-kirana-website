import type { Metadata } from 'next'
import { getCatalogue } from '@/lib/catalogue'
import { getDict, isLang, type Lang } from '@/lib/i18n'
import { SITE_URL } from '@/lib/site'
import { ShopBrowser } from '@/components/product/ShopBrowser'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const t = getDict(isLang(lang) ? lang : 'en')
  return {
    title: t.shop.title,
    description: lang === 'hi' ? 'गंगासागर किराणा स्टोअर्स के सभी उत्पाद: नाश्ते, दालें, चावल, मसाले, तेल और बहुत कुछ।' : 'Every product at Gangasagar Kirana Stores: snacks, dals, rice, spices, oils and more, loose or packed.',
    alternates: { canonical: `${SITE_URL}/${lang}/shop/`, languages: { en: `${SITE_URL}/en/shop/`, hi: `${SITE_URL}/hi/shop/` } },
  }
}

export default async function Shop({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = (await params) as { lang: Lang }
  const t = getDict(lang)
  const { products, categories } = await getCatalogue()
  return (
    <div className="wrap pt-10 sm:pt-16">
      <header className="mb-10 grid gap-6 md:grid-cols-12 md:items-end">
        <h1 className="display-xl md:col-span-8">{t.shop.title}</h1>
        <p className="text-muted md:col-span-4 md:pb-4">{t.home.categoriesLede}</p>
      </header>
      <ShopBrowser products={products} categories={categories} />
    </div>
  )
}
