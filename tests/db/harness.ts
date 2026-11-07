import fs from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { rpc, select, update, insert, remove, type Claims, type Filter } from '../../lib/backend/sql'

const root = path.resolve(import.meta.dirname, '../..')
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8')

export const MIGRATIONS = [
  'supabase/tests_stub.sql',
  'supabase/migrations/0001_schema.sql',
  'supabase/migrations/0002_functions.sql',
  'supabase/migrations/0003_security.sql',
  'supabase/migrations/0005_defaults.sql',
  'supabase/seed_catalogue.sql',
]

export async function freshDb() {
  const db = await PGlite.create()
  for (const m of MIGRATIONS) {
    try {
      await db.exec(read(m))
    } catch (e) {
      throw new Error(`${m}: ${(e as Error).message}`)
    }
  }
  return db
}

export const ADMIN: Claims = { role: 'authenticated', sub: '00000000-0000-4000-8000-0000000000a1', email: 'uttarwarsuyash@gmail.com' }
export const ADMIN2: Claims = { role: 'authenticated', sub: '00000000-0000-4000-8000-0000000000a2', email: 'lguttarwar1974.11@gmail.com' }
export const ALICE: Claims = { role: 'authenticated', sub: '00000000-0000-4000-8000-00000000000a', email: 'alice@example.com' }
export const BOB: Claims = { role: 'authenticated', sub: '00000000-0000-4000-8000-00000000000b', email: 'bob@example.com' }
export const ANON: Claims = { role: 'anon' }

export async function addUsers(db: PGlite, ...users: Claims[]) {
  for (const u of users) {
    await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3) on conflict do nothing`, [
      u.sub,
      u.email,
      JSON.stringify({ full_name: (u.email ?? 'x').split('@')[0] + ' Tester' }),
    ])
  }
}

export function client(db: PGlite, claims: Claims) {
  return {
    rpc: <T = any>(fn: string, p: unknown = {}) => rpc<T>(db, claims, fn, p),
    select: <T = any>(t: string, c = '*', f: Filter = {}) => select<T>(db, claims, t, c, f),
    update: (t: string, v: Record<string, unknown>, f: Filter) => update(db, claims, t, v, f),
    insert: (t: string, rows: Record<string, unknown>[], on?: string) => insert(db, claims, t, rows, on),
    remove: (t: string, f: Filter) => remove(db, claims, t, f),
  }
}

/** Set a variant's stock directly (test setup only, bypasses roles). */
export async function setStock(db: PGlite, variantId: string, stock: number) {
  await db.query(`update public.variants set stock = $2 where id = $1`, [variantId, stock])
}
export async function setSetting(db: PGlite, key: string, value: unknown) {
  await db.query(`update public.settings set value = $2::jsonb where key = $1`, [key, JSON.stringify(value)])
}
