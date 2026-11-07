import { IS_DEMO, SUPABASE_URL, SUPABASE_ANON_KEY, DEMO_READY_KEY } from './config'
import type { LivePrices } from '../types'

export interface LivePayload {
  prices: LivePrices
  settings: Record<string, unknown>
}

/** Small, dependency-free fetch of live prices + public settings. */
export async function liveFetch(): Promise<LivePayload | null> {
  if (IS_DEMO) {
    // Only use the demo database once it exists (it is created on first sign-in or admin visit).
    let ready = false
    try {
      ready = localStorage.getItem(DEMO_READY_KEY) === '1'
    } catch {}
    if (!ready) return null
    const { getBackend } = await import('./index')
    const b = await getBackend()
    const [cat, settings] = await Promise.all([b.rpc('live_catalogue'), b.rpc('public_settings')])
    return { prices: cat.prices, settings: { ...settings, store_mode: cat.store_mode } }
  }
  const h = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' }
  const call = (fn: string) =>
    fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: h, body: JSON.stringify({ p: {} }) }).then((r) => {
      if (!r.ok) throw new Error(String(r.status))
      return r.json()
    })
  const [cat, settings] = await Promise.all([call('live_catalogue'), call('public_settings')])
  return { prices: cat.prices, settings: { ...settings, store_mode: cat.store_mode } }
}
