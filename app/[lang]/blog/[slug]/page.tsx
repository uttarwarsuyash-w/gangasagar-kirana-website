import type { Metadata } from 'next'
import { LOCALES, type Lang } from '@/lib/i18n'
import { SITE_URL } from '@/lib/site'
import { getPosts } from '@/lib/content'
import { PostView } from '@/components/content/PostList'

export async function generateStaticParams() {
  const posts = await getPosts()
  const slugs = posts.length ? posts.map((p) => p.slug) : ['example-post']
  return LOCALES.flatMap((lang) => slugs.map((slug) => ({ lang, slug })))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }): Promise<Metadata> {
  const { lang, slug } = await params
  const post = (await getPosts()).find((p) => p.slug === slug)
  if (!post) return { robots: { index: false } }
  const hi = lang === 'hi'
  return {
    title: (hi ? post.seo_title_hi : post.seo_title_en) || (hi ? post.title_hi : post.title_en),
    description: (hi ? post.seo_description_hi : post.seo_description_en) || (hi ? post.excerpt_hi : post.excerpt_en) || undefined,
    alternates: { canonical: `${SITE_URL}/${lang}/blog/${slug}/`, languages: { en: `${SITE_URL}/en/blog/${slug}/`, hi: `${SITE_URL}/hi/blog/${slug}/` } },
    openGraph: post.cover_url ? { images: [post.cover_url] } : undefined,
  }
}

export default async function PostPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { slug } = (await params) as { lang: Lang; slug: string }
  const post = (await getPosts()).find((p) => p.slug === slug) ?? null
  return (
    <div className="wrap max-w-5xl pt-12 sm:pt-16">
      <PostView slug={slug} initial={post} />
    </div>
  )
}
