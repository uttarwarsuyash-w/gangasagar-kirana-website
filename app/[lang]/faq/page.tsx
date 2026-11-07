import type { Metadata } from 'next'
import { getDict, isLang, type Lang } from '@/lib/i18n'
import { SITE_URL } from '@/lib/site'
import { FaqList } from '@/components/content/FaqList'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const t = getDict(isLang(lang) ? lang : 'en')
  return { title: t.faq.title, description: t.faq.lede, alternates: { canonical: `${SITE_URL}/${lang}/faq/`, languages: { en: `${SITE_URL}/en/faq/`, hi: `${SITE_URL}/hi/faq/` } } }
}

export default async function Faq({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = (await params) as { lang: Lang }
  const t = getDict(lang)
  return (
    <div className="wrap pt-12 sm:pt-20">
      <h1 className="display-xl max-w-[10ch]">{t.faq.title}</h1>
      <p className="lede mb-14 mt-6">{t.faq.lede}</p>
      <FaqList />
    </div>
  )
}
