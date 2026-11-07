import type { Metadata } from 'next'
import { getDict, isLang, type Lang } from '@/lib/i18n'
import { SITE_URL } from '@/lib/site'
import { getPosts } from '@/lib/content'
import { PostList } from '@/components/content/PostList'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const t = getDict(isLang(lang) ? lang : 'en')
  return { title: t.blog.title, description: t.blog.lede, alternates: { canonical: `${SITE_URL}/${lang}/blog/`, languages: { en: `${SITE_URL}/en/blog/`, hi: `${SITE_URL}/hi/blog/` } } }
}

export default async function Blog({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = (await params) as { lang: Lang }
  const t = getDict(lang)
  return (
    <div className="wrap pt-12 sm:pt-20">
      <h1 className="display-xl">{t.blog.title}</h1>
      <p className="lede mb-14 mt-6">{t.blog.lede}</p>
      <PostList initial={await getPosts()} />
    </div>
  )
}
