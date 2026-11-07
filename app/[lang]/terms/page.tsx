import type { Metadata } from 'next'
import { getDict, type Lang } from '@/lib/i18n'
import { SITE_URL } from '@/lib/site'
import { getPolicy } from '@/lib/content'
import { PolicyPage } from '@/components/content/PolicyPage'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const p = await getPolicy('terms')
  return { title: lang === 'hi' ? p.title_hi : p.title_en, alternates: { canonical: `${SITE_URL}/${lang}/terms/`, languages: { en: `${SITE_URL}/en/terms/`, hi: `${SITE_URL}/hi/terms/` } } }
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = (await params) as { lang: Lang }
  return <PolicyPage lang={lang} t={getDict(lang)} policy={await getPolicy('terms')} />
}
