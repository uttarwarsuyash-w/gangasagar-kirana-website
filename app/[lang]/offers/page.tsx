import type { Metadata } from 'next'
import { getDict, isLang, type Lang } from '@/lib/i18n'
import { SITE_URL } from '@/lib/site'
import { OffersStrip } from '@/components/content/OffersStrip'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const t = getDict(isLang(lang) ? lang : 'en')
  return { title: t.offers.title, description: t.offers.lede, alternates: { canonical: `${SITE_URL}/${lang}/offers/`, languages: { en: `${SITE_URL}/en/offers/`, hi: `${SITE_URL}/hi/offers/` } } }
}

export default async function Offers({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = (await params) as { lang: Lang }
  const t = getDict(lang)
  return (
    <div className="wrap pt-12 sm:pt-20">
      <h1 className="display-xl">{t.offers.title}</h1>
      <p className="lede mb-12 mt-6">{t.offers.lede}</p>
      <OffersStrip />
    </div>
  )
}
