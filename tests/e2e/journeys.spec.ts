import { test, expect, type Page } from '@playwright/test'

const consoleErrors = (page: Page) => {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  page.on('console', (m) => m.type() === 'error' && !/404|Failed to load resource/.test(m.text()) && errs.push(m.text()))
  return errs
}

async function noHorizontalScroll(page: Page) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(over).toBeLessThanOrEqual(1)
}

test('home: tapping a snack swaps the headline and shows the product card', async ({ page }) => {
  const errs = consoleErrors(page)
  await page.goto('/en/?tier=lite')
  await expect(page.locator('#main p[aria-label^="Built on trust"]')).toBeVisible()
  await page.getByRole('button', { name: 'Green peas', exact: true }).click()
  await expect(page.locator('p[aria-label="Green peas"]')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Shop Green peas' })).toBeVisible()
  await noHorizontalScroll(page)
  expect(errs).toEqual([])
})

test('home in Hindi has lang="hi" and Hindi headline', async ({ page }) => {
  await page.goto('/hi/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi')
  await expect(page.locator('#main p[aria-label^="विश्वास की नींव"]')).toBeVisible()
})

test('reduced motion shows a still image instead of 3D', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto('/en/')
  await page.waitForTimeout(1500)
  await expect(page.locator('canvas')).toHaveCount(0)
  await ctx.close()
})

test('search finds peanuts by their Hindi name', async ({ page }) => {
  await page.goto('/en/search/?q=मूंगफली')
  await expect(page.getByRole('heading', { name: 'Raw peanuts' })).toBeVisible()
})

test('language switch keeps the same page', async ({ page, isMobile }) => {
  await page.goto('/en/contact/')
  if (isMobile) {
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('dialog').getByRole('link', { name: 'हिंदी' }).click()
  } else await page.getByRole('link', { name: 'हिंदी में देखें' }).click()
  await expect(page).toHaveURL(/\/hi\/contact\/$/)
})

test('product: the scale stepper adds 250 g and the bag meter explains delivery', async ({ page }) => {
  const errs = consoleErrors(page)
  await page.goto('/en/product/raw-peanuts/')
  await expect(page.getByRole('heading', { name: 'Raw peanuts' })).toBeVisible()
  await page.getByRole('button', { name: 'Add 250 g' }).click()
  await expect(page.locator('output', { hasText: '750 g' })).toBeVisible()
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click()
  await page.locator('#bag-button').click()
  await expect(page.getByText('Add 1.25 kg more and delivery drops to ₹49')).toBeVisible()
  await noHorizontalScroll(page)
  expect(errs).toEqual([])
})

test('full order: bag, sign in, checkout, confirmation, account, admin confirms it', async ({ page }) => {
  test.setTimeout(150_000)
  const errs = consoleErrors(page)
  await page.goto('/en/product/sugar/')
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click()
  await page.goto('/en/checkout/')
  await page.getByRole('button', { name: 'Continue with Google' }).click()
  await page.getByRole('button', { name: 'Continue as a demo customer' }).click()
  await expect(page.getByRole('heading', { name: 'Where should it go?' })).toBeVisible({ timeout: 45_000 })
  await page.locator('input[name=method][value=pickup]').check()
  await page.locator('input[autocomplete="name"]').first().fill('Test Customer')
  await page.locator('input[autocomplete="tel-national"]').first().fill('9876543210')
  await page.locator('input[type=checkbox][required]').check()
  await page.getByRole('button', { name: /Place order/ }).click()
  await expect(page.getByRole('heading', { name: 'Order placed' })).toBeVisible({ timeout: 30_000 })
  const number = (await page.locator('p.font-display.tnum').first().textContent())!.trim()
  expect(number).toMatch(/^GS\d{2}-\d+$/)
  await expect(page.getByText('Test order', { exact: true })).toBeVisible()

  await page.goto('/en/account/')
  await expect(page.getByRole('link', { name: new RegExp(number) })).toBeVisible()

  // Same browser becomes the demo admin
  await page.evaluate(() => localStorage.setItem('gs-demo-session', 'admin'))
  await page.goto('/admin/orders/')
  await page.getByRole('link', { name: number }).click()
  await page.getByRole('button', { name: 'Move to Order Confirmed' }).click()
  await expect(page.getByText('Moved to Order Confirmed')).toBeVisible()
  const waLink = page.getByRole('link', { name: /Send update on WhatsApp/ })
  await expect(waLink).toHaveAttribute('href', /^https:\/\/wa\.me\/919876543210\?text=.*Order%20Confirmed/)
  expect(errs).toEqual([])
})

test('admin is closed to non-admins', async ({ page }) => {
  await page.goto('/admin/')
  await expect(page.getByRole('heading', { name: 'Gangasagar admin' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
})

test('contact form sends an enquiry', async ({ page }) => {
  await page.goto('/en/contact/')
  await page.getByLabel('Your name').fill('Asha')
  await page.getByLabel('Mobile number').fill('9123456780')
  await page.getByLabel('Message').fill('Do you deliver to 431605?')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByText('Message sent', { exact: false })).toBeVisible({ timeout: 45_000 })
})

test('help pop-up answers delivery questions from the settings', async ({ page }) => {
  await page.goto('/en/faq/')
  await page.getByRole('button', { name: 'Help' }).click()
  await page.getByRole('button', { name: 'Delivery charges' }).click()
  await expect(page.getByRole('dialog', { name: 'How can we help?' }).getByText('Free for orders of ₹499 or more', { exact: false })).toBeVisible()
})

test('unknown pages show the bilingual 404', async ({ page }) => {
  const r = await page.goto('/en/no-such-page/')
  expect(r?.status()).toBe(404)
  await expect(page.getByText('This shelf is empty')).toBeVisible()
})

for (const path of ['/en/', '/en/shop/', '/en/category/dals/', '/en/journey/', '/hi/wholesale/', '/en/faq/', '/en/terms/']) {
  test(`no horizontal scrolling at 360 px: ${path}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    await page.goto(path)
    await noHorizontalScroll(page)
    await ctx.close()
  })
}
