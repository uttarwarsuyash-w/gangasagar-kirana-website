// Builds the demo database snapshot (public/demo/db.tar.gz) and copies the PGlite engine to
// public/pglite. Only needed when the site is built without Supabase keys (preview/demo mode).
import fs from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const root = path.resolve(import.meta.dirname, '..')
const files = [
  'supabase/tests_stub.sql',
  'supabase/migrations/0001_schema.sql',
  'supabase/migrations/0002_functions.sql',
  'supabase/migrations/0003_security.sql',
  'supabase/migrations/0005_defaults.sql',
  'supabase/seed_catalogue.sql',
]
const db = await PGlite.create()
for (const f of files) await db.exec(fs.readFileSync(path.join(root, f), 'utf8'))
// Demo accounts: one customer and the first admin. No orders, reviews or customers are seeded.
await db.query(`insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-00000000c001', 'demo.customer@example.com', '{"full_name":"Demo Customer"}'),
  ('00000000-0000-4000-8000-00000000a001', 'uttarwarsuyash@gmail.com', '{"full_name":"Suyash (demo)"}')`)
// UPI placeholder so the preview can show the payment step; clearly not a real ID.
await db.query(`update settings set value = '{"id":"demo@upi","payee":"Gangasagar Kirana Stores (demo)","qr_url":""}' where key = 'upi'`)
const dump = await db.dumpDataDir('gzip')
fs.mkdirSync(path.join(root, 'public/demo'), { recursive: true })
fs.writeFileSync(path.join(root, 'public/demo/db.tar.gz'), Buffer.from(await dump.arrayBuffer()))

const src = path.join(root, 'node_modules/@electric-sql/pglite/dist')
const dst = path.join(root, 'public/pglite')
fs.rmSync(dst, { recursive: true, force: true })
fs.mkdirSync(dst, { recursive: true })
for (const f of fs.readdirSync(src)) {
  if (/^(index\.js|chunk-[A-Z0-9]+\.js|pglite\.(wasm|data)|initdb\.(js|wasm))$/.test(f)) fs.copyFileSync(path.join(src, f), path.join(dst, f))
}
console.log('demo db:', (fs.statSync(path.join(root, 'public/demo/db.tar.gz')).size / 1024).toFixed(0), 'KB; pglite files:', fs.readdirSync(dst).length)
await db.close()
