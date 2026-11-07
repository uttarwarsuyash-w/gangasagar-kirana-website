// Before a build: read public settings and site content from Supabase (when keys are set) into
// content/remote.json, so admin edits (texts, translations, business details, section switches)
// are baked into the static pages. Without keys it writes an empty file.
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const out = path.join(root, 'content/remote.json')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
let data = { settings: {}, content: {} }
if (url && key) {
  const h = { apikey: key, Authorization: `Bearer ${key}` }
  try {
    const [s, c] = await Promise.all([
      fetch(`${url}/rest/v1/rpc/public_settings`, { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: '{"p":{}}' }).then((r) => r.json()),
      fetch(`${url}/rest/v1/content?select=key,value`, { headers: h }).then((r) => r.json()),
    ])
    data = { settings: s ?? {}, content: Object.fromEntries((Array.isArray(c) ? c : []).map((x) => [x.key, x.value])) }
    console.log(`remote: ${Object.keys(data.settings).length} settings, ${Object.keys(data.content).length} content entries`)
  } catch (e) {
    console.warn('remote: could not reach Supabase, using defaults:', e.message)
  }
}
fs.writeFileSync(out, JSON.stringify(data, null, 1))
// Small file for code that also runs in the browser (business details only).
const keep = ['phones', 'emails', 'hours', 'address', 'social', 'store_mode']
fs.writeFileSync(path.join(root, 'content/remote-settings.json'), JSON.stringify(Object.fromEntries(Object.entries(data.settings).filter(([k]) => keep.includes(k))), null, 1))
