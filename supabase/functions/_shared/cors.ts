// Shared helpers for Edge Functions (Deno). Allowed origins come from the SITE_ORIGINS secret,
// e.g. "https://gangasagar.pages.dev,https://www.example.in".
const ORIGINS = (Deno.env.get('SITE_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean)

export function cors(req: Request) {
  const origin = req.headers.get('origin') ?? ''
  const allow = ORIGINS.length === 0 || ORIGINS.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin) ? origin || '*' : ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

export function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } })
}
