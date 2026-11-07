import { chromium } from '@playwright/test'
const B = 'http://localhost:4321'
const S = '/home/claude/work/shots/admin/'
import fs from 'node:fs'
fs.mkdirSync(S, { recursive: true })
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } })
const errs = []
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message))
page.on('console', (m) => m.type() === 'error' && !/404|Failed to load/.test(m.text()) && errs.push(m.text().slice(0, 200)))
// customer places an order first
await page.goto(B + '/en/product/toor-dal/', { waitUntil: 'networkidle' })
await page.click('button:has-text("Add to bag")')
await page.goto(B + '/en/checkout/', { waitUntil: 'networkidle' })
await page.click('button:has-text("Continue with Google")')
await page.click('button:has-text("demo customer")')
await page.waitForTimeout(5000)
await page.check('input[name=method][value=pickup]')
await page.locator('input[autocomplete="name"]').first().fill('Ravi Patil')
await page.locator('input[autocomplete="tel-national"]').first().fill('9876543210')
await page.check('input[type=checkbox][required]')
await page.click('button:has-text("Place order")')
await page.waitForTimeout(4000)
console.log('order url', page.url())
// switch to admin
await page.evaluate(() => localStorage.setItem('gs-demo-session', 'admin'))
for (const p of ['/admin/', '/admin/orders/', '/admin/inventory/', '/admin/customers/']) {
  await page.goto(B + p, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: S + (p.replace(/[/?=]+/g, '_').replace(/^_|_$/g, '') || 'overview') + '.png', fullPage: false })
}
// open the order and move it forward
await page.goto(B + '/admin/orders/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
await page.click('table a')
await page.waitForTimeout(2500)
await page.click('button:has-text("Move to Order Confirmed")')
await page.waitForTimeout(1500)
await page.click('button:has-text("Mark as paid")')
await page.waitForTimeout(1500)
await page.click('button:has-text("Move to Delivered")')
await page.waitForTimeout(1500)
await page.screenshot({ path: S + 'order-view.png', fullPage: true })
console.log(errs.join('\n') || 'no errors')
await browser.close()
