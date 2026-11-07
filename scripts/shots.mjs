// Screenshot many pages: node scripts/shots.mjs <outdir> <w> <h> <full:0|1> path1 path2 ...
import { chromium } from '@playwright/test'
const [out, w, h, full, ...paths] = process.argv.slice(2)
const base = process.env.BASE || 'http://localhost:4321'
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference' })
for (const p of paths) {
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))
  page.on('console', (m) => m.type() === 'error' && !/404|Failed to load/.test(m.text()) && errs.push(m.text().slice(0, 160)))
  await page.goto(base + p, { waitUntil: 'networkidle' }).catch((e) => errs.push(String(e)))
  await page.waitForTimeout(+(process.env.WAIT || 1500))
  const name = p.replace(/[/?=&]+/g, '_').replace(/^_|_$/g, '') || 'root'
  await page.screenshot({ path: `${out}/${name}-${w}.png`, fullPage: full === '1' })
  if (errs.length) console.log(p, 'ERRORS:', errs.join(' | '))
  await page.close()
}
await browser.close()
