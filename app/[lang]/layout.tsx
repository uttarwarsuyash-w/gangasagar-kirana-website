import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { LOCALES, isLang, getDict, type Lang } from '@/lib/i18n'
import { getCatalogue } from '@/lib/catalogue'
import { SiteShell } from '@/components/layout/SiteShell'
import { Footer } from '@/components/layout/Footer'

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const t = getDict(isLang(lang) ? lang : 'en')
  return {
    title: { default: t.meta.title, template: `%s | ${lang === 'hi' ? 'गंगासागर किराणा स्टोअर्स' : 'Gangasagar Kirana Stores'}` },
    description: t.meta.description,
    openGraph: { siteName: 'Gangasagar Kirana Stores', locale: lang === 'hi' ? 'hi_IN' : 'en_IN', type: 'website', images: ['/og.jpg'] },
  }
}

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const t = getDict(lang as Lang)
  const { categories } = await getCatalogue()
  return (
    <SiteShell lang={lang as Lang} dict={t} footer={<Footer lang={lang as Lang} t={t} categories={categories} />}>
      {children}
    </SiteShell>
  )
}
