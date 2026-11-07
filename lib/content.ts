// Build-time site content. Admin edits in the `content` table override these defaults when the
// site is rebuilt with the Publish button.
import { POLICIES, type PolicyKey } from '@/content/policies'

import remote from '@/content/remote.json'

type Bi = { title_en?: string; title_hi?: string; en: string; hi: string }
const all = (remote as { content: Record<string, unknown> }).content ?? {}

export function getContent<T>(key: string, fallback: T): T {
  const v = all[key]
  return v && typeof v === 'object' ? ({ ...fallback, ...(v as object) } as T) : fallback
}

export async function getPolicy(key: PolicyKey): Promise<Bi> {
  return getContent<Bi>(`policy.${key}`, POLICIES[key] as unknown as Bi)
}

/** Posts published at build time (for static article pages). */
export async function getPosts() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return []
  try {
    const r = await fetch(`${url}/rest/v1/posts?select=*&is_published=eq.true&order=published_at.desc.nullslast`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' })
    return r.ok ? ((await r.json()) as Post[]) : []
  } catch {
    return []
  }
}

export interface Post {
  id: string
  slug: string
  title_en: string
  title_hi: string
  excerpt_en: string | null
  excerpt_hi: string | null
  body_en: string | null
  body_hi: string | null
  cover_url: string | null
  seo_title_en: string | null
  seo_title_hi: string | null
  seo_description_en: string | null
  seo_description_hi: string | null
  published_at: string | null
}
