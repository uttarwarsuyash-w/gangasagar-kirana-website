import { IS_DEMO } from './config'
import type { Backend } from './types'
export type { Backend, SessionUser } from './types'
export { BackendError } from './types'

let p: Promise<Backend> | null = null

/** Loads supabase-js (or the demo database) only when a page actually needs it. */
export function getBackend(): Promise<Backend> {
  p ??= IS_DEMO ? import('./demo').then((m) => m.createDemoBackend()) : import('./supabase').then((m) => m.createSupabaseBackend())
  return p
}

export function errorCode(e: unknown): string {
  const err = e as { code?: string; message?: string }
  const c = err?.code && !/^\d/.test(err.code) && err.code.length < 40 ? err.code : err?.message
  return (c || 'generic').split(':')[0].trim()
}
