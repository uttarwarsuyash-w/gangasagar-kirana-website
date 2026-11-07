// Publish: rebuilds the website on Cloudflare Pages (deploy hook). Admins only.
// Secrets: CF_DEPLOY_HOOK_URL (from Cloudflare Pages > Settings > Builds > Deploy hooks).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { cors, json } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  const auth = req.headers.get('Authorization') ?? ''
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: isAdmin, error } = await sb.rpc('is_admin')
  if (error || !isAdmin) return json(req, { error: 'not_admin' }, 403)
  const hook = Deno.env.get('CF_DEPLOY_HOOK_URL')
  if (!hook) return json(req, { error: 'deploy_hook_missing' }, 500)
  const r = await fetch(hook, { method: 'POST' })
  if (!r.ok) return json(req, { error: 'deploy_hook_failed', status: r.status }, 502)
  await sb.rpc('admin_mark_published', { p: {} })
  return json(req, { ok: true })
})
