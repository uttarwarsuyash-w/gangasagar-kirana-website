// Runs before `next build`: self-hosted fonts, and the demo database when no Supabase keys are set.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const run = (f) => execFileSync(process.execPath, [path.join(root, 'scripts', f)], { stdio: 'inherit', cwd: root })

run('fetch-remote.mjs')
run('fonts.mjs')
if (!fs.existsSync(path.join(root, 'lib/images.json'))) run('images.mjs')
const demo = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (demo) {
  console.log('No Supabase keys: building in demo mode (in-browser database).')
  run('demo-db.mjs')
} else {
  fs.rmSync(path.join(root, 'public/pglite'), { recursive: true, force: true })
  fs.rmSync(path.join(root, 'public/demo'), { recursive: true, force: true })
}
