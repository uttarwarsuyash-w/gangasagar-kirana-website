// Shared by the in-browser demo database and the automated tests: runs SQL as a given
// Supabase role with JWT claims, so row-level security and function checks behave as in production.
import type { PGlite, Transaction } from '@electric-sql/pglite'

export type Role = 'anon' | 'authenticated' | 'service_role'
export interface Claims {
  role: Role
  sub?: string
  email?: string
}

export class DbError extends Error {
  code: string
  detail?: string
  constructor(code: string, detail?: string) {
    super(code)
    this.code = code
    this.detail = detail
  }
}

const IDENT = /^[a-z_][a-z0-9_]*$/

export function ident(name: string) {
  if (!IDENT.test(name)) throw new DbError('bad_identifier', name)
  return name
}

function wrap(e: unknown): never {
  const err = e as { message?: string; detail?: string; code?: string }
  if (err && typeof err.message === 'string') throw new DbError(err.message, err.detail)
  throw e
}

export async function asRole<T>(db: PGlite, claims: Claims, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  try {
    return await db.transaction(async (tx) => {
      await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)])
      await tx.exec(`set local role ${ident(claims.role)}`)
      return fn(tx)
    })
  } catch (e) {
    wrap(e)
  }
}

export async function rpc<T = unknown>(db: PGlite, claims: Claims, fn: string, p: unknown = {}): Promise<T> {
  return asRole(db, claims, async (tx) => {
    const r = await tx.query<{ r: T }>(`select public.${ident(fn)}($1::jsonb) as r`, [JSON.stringify(p ?? {})])
    return r.rows[0].r
  })
}

// ---- tiny table query builder (subset of what supabase-js offers) ----
export interface Filter {
  eq?: Record<string, unknown>
  in?: [string, unknown[]]
  ilike?: [string, string]
  order?: [string, 'asc' | 'desc']
  limit?: number
}

function where(f: Filter, params: unknown[]) {
  const parts: string[] = []
  for (const [k, v] of Object.entries(f.eq ?? {})) {
    if (v === null) parts.push(`${ident(k)} is null`)
    else {
      params.push(v)
      parts.push(`${ident(k)} = $${params.length}`)
    }
  }
  if (f.in) {
    params.push(f.in[1])
    parts.push(`${ident(f.in[0])} = any($${params.length})`)
  }
  if (f.ilike) {
    params.push(f.ilike[1])
    parts.push(`${ident(f.ilike[0])} ilike $${params.length}`)
  }
  return parts.length ? ` where ${parts.join(' and ')}` : ''
}

function cols(columns?: string) {
  if (!columns || columns.trim() === '*') return '*'
  return columns
    .split(',')
    .map((c) => ident(c.trim()))
    .join(', ')
}

function jsonable(v: unknown) {
  if (v !== null && typeof v === 'object' && !Array.isArray(v)) return JSON.stringify(v)
  return v
}

export async function select<T>(db: PGlite, claims: Claims, table: string, columns = '*', f: Filter = {}): Promise<T[]> {
  return asRole(db, claims, async (tx) => {
    const params: unknown[] = []
    let sql = `select ${cols(columns)} from public.${ident(table)}${where(f, params)}`
    if (f.order) sql += ` order by ${ident(f.order[0])} ${f.order[1] === 'desc' ? 'desc' : 'asc'}`
    if (f.limit) sql += ` limit ${Math.max(1, Math.min(5000, Math.floor(f.limit)))}`
    return (await tx.query<T>(sql, params)).rows
  })
}

export async function insert<T>(db: PGlite, claims: Claims, table: string, rows: Record<string, unknown>[], upsertOn?: string): Promise<T[]> {
  if (!rows.length) return []
  return asRole(db, claims, async (tx) => {
    const out: T[] = []
    for (const row of rows) {
      const keys = Object.keys(row).map(ident)
      const params = keys.map((k) => jsonable(row[k]))
      let sql = `insert into public.${ident(table)} (${keys.join(', ')}) values (${keys.map((_, i) => `$${i + 1}`).join(', ')})`
      if (upsertOn) {
        const conflict = upsertOn.split(',').map((c) => ident(c.trim()))
        const upd = keys.filter((k) => !conflict.includes(k))
        sql += ` on conflict (${conflict.join(', ')}) do ${upd.length ? `update set ${upd.map((k) => `${k} = excluded.${k}`).join(', ')}` : 'nothing'}`
      }
      // returning * would need select on every column; callers that need rows re-select.
      await tx.query(sql, params)
      out.push(row as T)
    }
    return out
  })
}

export async function update(db: PGlite, claims: Claims, table: string, values: Record<string, unknown>, f: Filter): Promise<number> {
  return asRole(db, claims, async (tx) => {
    const keys = Object.keys(values).map(ident)
    const params: unknown[] = keys.map((k) => jsonable(values[k]))
    const sql = `update public.${ident(table)} set ${keys.map((k, i) => `${k} = $${i + 1}`).join(', ')}${where(f, params)}`
    const r = await tx.query(sql, params)
    return r.affectedRows ?? 0
  })
}

export async function remove(db: PGlite, claims: Claims, table: string, f: Filter): Promise<number> {
  return asRole(db, claims, async (tx) => {
    const params: unknown[] = []
    const w = where(f, params)
    if (!w) throw new DbError('refusing_unfiltered_delete')
    const r = await tx.query(`delete from public.${ident(table)}${w}`, params)
    return r.affectedRows ?? 0
  })
}
