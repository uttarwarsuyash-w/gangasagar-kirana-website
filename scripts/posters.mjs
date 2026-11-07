// Renders still images of the 3D snack piles (reduced-motion posters and category art)
// from the real scene in headless Chrome. Needs a running build: node scripts/serve.mjs
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { chromium } from '@playwright/test'

const root = path.resolve(import.meta.dirname, '..')
const base = process.argv[2] || 'http://localhost:4321'
const out = path.join(root, 'assets/renders')
fs.mkdirSync(out, { recursive: true })
const cat = JSON.parse(fs.readFileSync(path.join(root, 'seed/catalogue.json'), 'utf8'))
const snacks = fs.readFileSync(path.join(root, 'lib/snacks.ts'), 'utf8')
const sizeOf = (k) => Number(new RegExp(`\\b${k}: \\{[^}]*size: ([0-9.]+)`).exec(snacks)?.[1] ?? 0.6)
const hero = ['peanut', 'chana_salted', 'chana_plain', 'pea_green', 'pea_yellow', 'orange_candy', 'chikki']

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
async function grab(kind, w, h, scale) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
  await page.goto(`${base}/en/?tier=full&poster=${kind}${scale ? `&scale=${scale}` : ''}`, { waitUntil: 'load' })
  const data = await page.waitForFunction(() => window.__gsPoster, null, { timeout: 60000 }).then((h) => h.jsonValue())
  await page.close()
  return Buffer.from(data.split(',')[1], 'base64')
}
const only = process.argv[3]
for (const k of hero) {
  if (only && only !== 'hero' && only !== k) continue
  const png = await grab(k, 1600, 940)
  const meta = await sharp(png).metadata()
  // keep the bottom half where the pile rests
  await sharp(png).extract({ left: 0, top: Math.round(meta.height * 0.45), width: meta.width, height: Math.round(meta.height * 0.55) }).png().toFile(path.join(out, `hero-${k}.png`))
  console.log('hero', k)
}
for (const c of cat.categories) {
  if (only && only !== 'cats') break
  if (!c.pour_kind) continue
  const png = await grab(c.pour_kind, 700, 900, (2.4 * Math.pow(0.62 / sizeOf(c.pour_kind), 0.75)).toFixed(2))
  const meta = await sharp(png).metadata()
  const top = Math.round(meta.height * 0.5)
  await sharp(png).extract({ left: 0, top, width: meta.width, height: meta.height - top }).png().toFile(path.join(out, `cat-${c.id}.png`))
  console.log('category', c.id)
}
await browser.close()
