// Screenshot helper for review: node scripts/shot.mjs <url> <out.png> [width] [height] [waitMs] [fullPage]
import { chromium } from '@playwright/test'
const [url, out, w = '1280', h = '800', wait = '2500', full = '0', action = ''] = process.argv.slice(2)
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 })
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message))
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(+wait)
if (action) {
  for (const step of action.split(';')) {
    const [kind, arg] = step.split('=')
    if (kind === 'click') await page.click(arg)
    if (kind === 'wait') await page.waitForTimeout(+arg)
    if (kind === 'scroll') await page.evaluate((y) => window.scrollTo(0, +y), arg)
  }
}
await page.screenshot({ path: out, fullPage: full === '1' })
if (errors.length) console.log('CONSOLE ERRORS:\n' + errors.slice(0, 10).join('\n'))
await browser.close()
