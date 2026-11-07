// Emails both admin addresses about a new order or quotation request (Resend).
// Secrets: RESEND_API_KEY, NOTIFY_FROM (e.g. "Gangasagar <orders@yourdomain.in>").
// Switched on after the domain exists; until then the admin dashboard badge shows new orders.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { cors, json } from '../_shared/cors.ts'

const TO = ['uttarwarsuyash@gmail.com', 'lguttarwar1974.11@gmail.com']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  const key = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('NOTIFY_FROM')
  if (!key || !from) return json(req, { ok: true, skipped: 'email_not_configured' })
  const auth = req.headers.get('Authorization') ?? ''
  // Read as the caller: they can only read their own order, so nobody can trigger mail about others.
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const body = await req.json().catch(() => ({}))
  let subject = ''
  let text = ''
  if (body.order_id) {
    const { data: o, error } = await sb.rpc('my_order', { p: { id: body.order_id } })
    if (error || !o) return json(req, { error: 'not_found' }, 404)
    if (Date.now() - new Date(o.created_at).getTime() > 10 * 60 * 1000) return json(req, { ok: true, skipped: 'old' })
    subject = `New order ${o.number}: Rs. ${o.total}${o.is_test ? ' (TEST)' : ''}`
    text = [
      `${o.customer_name}, ${o.phone}`,
      `${o.zone === 'nanded' ? 'Nanded' : 'Outside Nanded'} · ${o.method} · ${o.payment_method}`,
      '',
      ...o.items.map((i: { name_en: string; is_loose: boolean; quantity: number; variant_en: string; line_total: number }) => `- ${i.name_en} ${i.is_loose ? `${i.quantity} g` : `${i.quantity} x ${i.variant_en}`}: Rs. ${i.line_total}`),
      '',
      `Total Rs. ${o.total}`,
      o.notes ? `Note: ${o.notes}` : '',
      '',
      'Open the admin to confirm it.',
    ].join('\n')
  } else if (body.quotation) {
    subject = `New wholesale quotation request ${String(body.quotation).slice(0, 20)}`
    text = 'A customer asked for a wholesale price. Open Admin > Quotations to price it.'
  } else return json(req, { error: 'bad_request' }, 400)
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: TO, subject, text }),
  })
  return json(req, { ok: r.ok })
})
