import type { Filter } from './sql'
export type { Filter }

export interface SessionUser {
  id: string
  email: string
  name: string | null
  avatar?: string | null
}

export interface Backend {
  mode: 'supabase' | 'demo'
  rpc<T = any>(fn: string, p?: unknown): Promise<T>
  select<T = any>(table: string, columns?: string, f?: Filter): Promise<T[]>
  insert(table: string, rows: Record<string, unknown>[], upsertOn?: string): Promise<void>
  update(table: string, values: Record<string, unknown>, f: Filter): Promise<number>
  remove(table: string, f: Filter): Promise<number>
  getUser(): Promise<SessionUser | null>
  onAuthChange(cb: (u: SessionUser | null) => void): () => void
  signInWithGoogle(next: string): Promise<void>
  /** Demo only: pick a demo account. */
  demoSignIn?(who: 'customer' | 'admin'): Promise<void>
  signOut(): Promise<void>
  upload(bucket: 'products' | 'gallery' | 'content', file: Blob, name: string): Promise<string>
  invoke(fn: string, body: unknown): Promise<any>
}

export class BackendError extends Error {
  code: string
  detail?: string
  constructor(code: string, detail?: string) {
    super(code)
    this.code = code
    this.detail = detail
  }
}
