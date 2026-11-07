// Public forms with Cloudflare Turnstile: verifies the token, then saves the enquiry.
// Secrets: TURNSTILE_SECRET_KEY. Uses the service role only to call submit_enquiry().
import { createClient } from 'npm:@supabase/supabase-js@2'
import { cors, json } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json(req, { error: 'bad_request' }, 400)
  }
  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
  if (!secret) return json(req, { error: 'verification_not_configured' }, 500)
  const form = new FormData()
  form.append('secret', secret)
  form.append('response', String(body.token ?? ''))
  form.append('remoteip', ip)
  const v = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form }).then((r) => r.json())
  if (!v.success) return json(req, { error: 'verification_required' }, 400)
  const { token: _t, ...fields } = body
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  // Pass the signed-in user's id along when present, so the enquiry shows in their account.
  const { data, error } = await admin.rpc('submit_enquiry', { p: { ...fields, client_ip: ip } })
  if (error) return json(req, { error: error.message }, 400)
  return json(req, data)
})
