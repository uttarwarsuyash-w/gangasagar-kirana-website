export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''
/** No Supabase keys at build time -> the site runs on the in-browser demo database. */
export const IS_DEMO = !SUPABASE_URL || !SUPABASE_ANON_KEY
export const DEMO_READY_KEY = 'gs-demo-db-v1'
