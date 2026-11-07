'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useI18n } from '@/components/providers/I18n'
import { getBackend } from '@/lib/backend'
import { IS_DEMO, DEMO_READY_KEY } from '@/lib/backend/config'
import { dateShort } from '@/lib/format'
import { Picture } from '@/components/ui/Picture'
import { Markdown } from '@/lib/md'
import type { Post } from '@/lib/content'

function demoCold() {
  if (!IS_DEMO) return false
  try {
    return localStorage.getItem(DEMO_READY_KEY) !== '1'
  } catch {
    return true
  }
}

export function PostList({ initial }: { initial: Post[] }) {
  const { t, lang, p, href } = useI18n()
  const [posts, setPosts] = useState(initial)
  useEffect(() => {
    if (demoCold()) return
    getBackend()
      .then((b) => b.select<Post & { is_published: boolean }>('posts', 'id,slug,title_en,title_hi,excerpt_en,excerpt_hi,cover_url,published_at,is_published', { order: ['published_at', 'desc'] }))
      .then((rows) => setPosts(rows.filter((r) => r.is_published) as Post[]))
      .catch(() => {})
  }, [])
  if (!posts.length)
    return (
      <div className="max-w-xl rounded-[1.75rem] border-2 border-dashed border-line p-8">
        <p className="display-s">{t.blog.empty}</p>
        <p className="mt-2 text-muted">{t.blog.emptyBody}</p>
      </div>
    )
  return (
    <ul className="grid gap-10 md:grid-cols-2">
      {posts.map((x, i) => (
        <li key={x.id} className={i % 2 ? 'md:mt-16' : ''}>
          <Link href={href(`/blog/${x.slug}/`)} className="group block">
            {x.cover_url && (
              <div className="aspect-[16/10] overflow-hidden rounded-[1.6rem] bg-paper-2">
                <Picture src={x.cover_url} alt="" sizes="(min-width: 768px) 45vw, 92vw" imgClassName="transition-transform duration-700 group-hover:scale-[1.04]" />
              </div>
            )}
            {x.published_at && <p className="meta mt-4">{dateShort(x.published_at, lang)}</p>}
            <h2 className="display-s mt-2 group-hover:text-brand">{p(x, 'title')}</h2>
            {p(x, 'excerpt') && <p className="mt-2 text-muted">{p(x, 'excerpt')}</p>}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function PostView({ slug, initial }: { slug: string; initial: Post | null }) {
  const { t, lang, p, href } = useI18n()
  const [post, setPost] = useState<Post | null | undefined>(initial ?? undefined)
  useEffect(() => {
    if (initial || demoCold()) {
      if (!initial) setPost(null)
      return
    }
    getBackend()
      .then((b) => b.select<Post & { is_published: boolean }>('posts', '*', { eq: { slug } }))
      .then((r) => setPost(r[0] && r[0].is_published ? r[0] : null))
      .catch(() => setPost(null))
  }, [slug, initial])
  if (post === undefined) return <div className="skeleton h-96 max-w-3xl" />
  if (post === null)
    return (
      <div className="max-w-xl">
        <p className="display-s">{t.notFound.title}</p>
        <Link href={href('/blog/')} className="btn btn-ink mt-6">
          {t.blog.back}
        </Link>
      </div>
    )
  return (
    <article>
      <Link href={href('/blog/')} className="meta hover:text-ink">
        ← {t.blog.back}
      </Link>
      <h1 className="display-l mt-6 max-w-[18ch]">{p(post, 'title')}</h1>
      {post.published_at && <p className="meta mt-4">{dateShort(post.published_at, lang)}</p>}
      {post.cover_url && (
        <div className="mt-10 aspect-[16/9] overflow-hidden rounded-[1.75rem]">
          <Picture src={post.cover_url} alt="" sizes="(min-width: 1024px) 70vw, 94vw" />
        </div>
      )}
      <Markdown text={p(post, 'body')} className="prose-gs mt-10 text-[1.08rem]" />
    </article>
  )
}
