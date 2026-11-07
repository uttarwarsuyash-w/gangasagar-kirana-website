// Demo backend: the real database (same SQL migrations, functions and security rules) running
// inside the browser with PGlite. Used when the site is built without Supabase keys.
import { asRole, rpc, select, insert, update, remove, type Claims } from './sql'
import { DEMO_READY_KEY } from './config'
import { BackendError, type Backend, type SessionUser } from './types'
import type { PGlite } from '@electric-sql/pglite'

const SESSION_KEY = 'gs-demo-session'
const USERS: Record<'customer' | 'admin', SessionUser> = {
  customer: { id: '00000000-0000-4000-8000-00000000c001', email: 'demo.customer@example.com', name: 'Demo Customer' },
  admin: { id: '00000000-0000-4000-8000-00000000a001', email: 'uttarwarsuyash@gmail.com', name: 'Suyash (demo)' },
}

let dbPromise: Promise<PGlite> | null = null

async function openDb(): Promise<PGlite> {
  // Loaded from /public so the 15 MB engine never enters the normal JavaScript bundle.
  const url = '/pglite/index.js'
  const mod = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url)) as typeof import('@electric-sql/pglite')
  let ready = false
  try {
    ready = localStorage.getItem(DEMO_READY_KEY) === '1'
  } catch {}
  const seed = ready ? undefined : await fetch('/demo/db.tar.gz').then((r) => (r.ok ? r.blob() : Promise.reject(new Error('demo db missing'))))
  let db: PGlite
  try {
    db = await mod.PGlite.create('idb://gangasagar-demo-v1', seed ? { loadDataDir: seed } : {})
    await db.query('select 1 from public.settings limit 1')
  } catch {
    // Private browsing or a broken store: fall back to memory (resets on reload).
    const blob = seed ?? (await fetch('/demo/db.tar.gz').then((r) => r.blob()))
    db = await mod.PGlite.create({ loadDataDir: blob })
  }
  try {
    localStorage.setItem(DEMO_READY_KEY, '1')
  } catch {}
  return db
}

function getDb() {
  dbPromise ??= openDb()
  return dbPromise
}

function currentUser(): SessionUser | null {
  try {
    const who = localStorage.getItem(SESSION_KEY) as 'customer' | 'admin' | null
    return who && USERS[who] ? USERS[who] : null
  } catch {
    return null
  }
}

function claims(): Claims {
  const u = currentUser()
  return u ? { role: 'authenticated', sub: u.id, email: u.email } : { role: 'anon' }
}

const listeners = new Set<(u: SessionUser | null) => void>()

async function ensureUser(db: PGlite, u: SessionUser) {
  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3) on conflict (id) do nothing`, [
    u.id,
    u.email,
    JSON.stringify({ full_name: u.name }),
  ])
}

export function createDemoBackend(): Backend {
  const wrap = async <T>(fn: (db: PGlite) => Promise<T>): Promise<T> => {
    const db = await getDb()
    try {
      return await fn(db)
    } catch (e) {
      const err = e as { code?: string; detail?: string; message?: string }
      throw new BackendError(err.code || err.message || 'generic', err.detail)
    }
  }
  return {
    mode: 'demo',
    rpc: (fn, p = {}) => wrap((db) => rpc(db, claims(), fn, p)),
    select: (table, columns = '*', f = {}) => wrap((db) => select(db, claims(), table, columns, f)),
    insert: (table, rows, on) => wrap(async (db) => void (await insert(db, claims(), table, rows, on))),
    update: (table, values, f) => wrap((db) => update(db, claims(), table, values, f)),
    remove: (table, f) => wrap((db) => remove(db, claims(), table, f)),
    async getUser() {
      return currentUser()
    },
    onAuthChange(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    async signInWithGoogle() {
      throw new BackendError('demo_pick_account')
    },
    async demoSignIn(who) {
      const db = await getDb()
      await ensureUser(db, USERS[who])
      localStorage.setItem(SESSION_KEY, who)
      listeners.forEach((l) => l(USERS[who]))
    },
    async signOut() {
      localStorage.removeItem(SESSION_KEY)
      listeners.forEach((l) => l(null))
    },
    async upload(_bucket, file) {
      if (file.size > 2 * 1024 * 1024) throw new BackendError('file_too_large')
      return await new Promise<string>((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(String(r.result))
        r.onerror = () => rej(new BackendError('upload_failed'))
        r.readAsDataURL(file)
      })
    },
    async invoke(fn) {
      if (fn === 'publish') return wrap((db) => rpc(db, claims(), 'admin_mark_published', {}))
      return { ok: true, demo: true }
    },
  }
}

export { asRole }
