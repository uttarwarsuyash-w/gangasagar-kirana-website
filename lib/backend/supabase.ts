import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config'
import { BackendError, type Backend, type Filter, type SessionUser } from './types'

function toUser(u: User | null | undefined): SessionUser | null {
  if (!u) return null
  return {
    id: u.id,
    email: u.email ?? '',
    name: (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || null,
    avatar: (u.user_metadata?.avatar_url as string) || null,
  }
}

function fail(e: { message?: string; details?: string; code?: string } | null): never {
  throw new BackendError(e?.message || 'generic', e?.details)
}

function applyFilter<Q extends { eq: Function; in: Function; ilike: Function; order: Function; limit: Function }>(q: Q, f: Filter = {}): Q {
  let r: any = q
  for (const [k, v] of Object.entries(f.eq ?? {})) r = v === null ? r.is(k, null) : r.eq(k, v)
  if (f.in) r = r.in(f.in[0], f.in[1])
  if (f.ilike) r = r.ilike(f.ilike[0], f.ilike[1])
  if (f.order) r = r.order(f.order[0], { ascending: f.order[1] !== 'desc' })
  if (f.limit) r = r.limit(f.limit)
  return r
}

export function createSupabaseBackend(): Backend {
  const sb: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
  return {
    mode: 'supabase',
    async rpc(fn, p = {}) {
      const { data, error } = await sb.rpc(fn, { p })
      if (error) fail(error)
      return data
    },
    async select(table, columns = '*', f) {
      const { data, error } = await applyFilter(sb.from(table).select(columns) as any, f)
      if (error) fail(error)
      return data as any[]
    },
    async insert(table, rows, upsertOn) {
      const q = upsertOn ? sb.from(table).upsert(rows, { onConflict: upsertOn }) : sb.from(table).insert(rows)
      const { error } = await q
      if (error) fail(error)
    },
    async update(table, values, f) {
      const { error, count } = await applyFilter(sb.from(table).update(values, { count: 'exact' }) as any, f)
      if (error) fail(error)
      return count ?? 0
    },
    async remove(table, f) {
      if (!f.eq && !f.in) throw new BackendError('refusing_unfiltered_delete')
      const { error, count } = await applyFilter(sb.from(table).delete({ count: 'exact' }) as any, f)
      if (error) fail(error)
      return count ?? 0
    },
    async getUser() {
      const { data } = await sb.auth.getSession()
      return toUser(data.session?.user)
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_e, s) => cb(toUser(s?.user)))
      return () => data.subscription.unsubscribe()
    },
    async signInWithGoogle(next) {
      const redirectTo = `${location.origin}/auth/callback/?next=${encodeURIComponent(next)}`
      const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
      if (error) fail(error)
    },
    async signOut() {
      await sb.auth.signOut()
    },
    async upload(bucket, file, name) {
      const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID().slice(0, 8)}-${name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`
      const { error } = await sb.storage.from(bucket).upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type })
      if (error) fail({ message: error.message })
      return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl
    },
    async invoke(fn, body) {
      const { data, error } = await sb.functions.invoke(fn, { body: body as Record<string, unknown> })
      if (error) fail({ message: error.message })
      return data
    },
  }
}
