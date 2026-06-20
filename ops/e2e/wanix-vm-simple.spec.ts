import { expect, test } from '@playwright/test'

import {
  attachwanixpaniccollector,
  WANIX_GOJS_PANIC_RE,
} from './helpers/wanixpanic'

test.describe('wanix vm-simple upstream baseline', () => {
  test.describe.configure({ timeout: 600_000 })

  test('vm-simple.html shows login prompt without gojs panic', async ({ page }) => {
    const collector = attachwanixpaniccollector(page)
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/wanix/vm-simple.html')
    await page.locator('wanix-term').click({ timeout: 120_000 })
    await page.waitForFunction(
      () => {
        const rows = document.querySelector('.xterm-rows')
        return rows != null && /login:/i.test(rows.textContent ?? '')
      },
      { timeout: 600_000 },
    )

    const panics = [
      ...collector.filterpanics(),
      ...errors.filter((line) => WANIX_GOJS_PANIC_RE.test(line)),
    ]
    expect(panics, panics.join('\n')).toEqual([])
    collector.detach()
  })

  test('vm-simple.html login and id via wanix-term keyboard', async ({ page }) => {
    const collector = attachwanixpaniccollector(page)
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/wanix/vm-simple.html')
    const term = page.locator('wanix-term')
    await term.click({ timeout: 120_000 })

    await page.waitForFunction(
      () => {
        const rows = document.querySelector('.xterm-rows')
        return rows != null && /login:/i.test(rows.textContent ?? '')
      },
      { timeout: 600_000 },
    )

    await page.keyboard.type('root')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')
    await page.keyboard.type('id')
    await page.keyboard.press('Enter')

    await page.waitForFunction(
      () => {
        const rows = document.querySelector('.xterm-rows')
        return rows != null && /uid=/.test(rows.textContent ?? '')
      },
      { timeout: 120_000 },
    )

    const panics = [
      ...collector.filterpanics(),
      ...errors.filter((line) => WANIX_GOJS_PANIC_RE.test(line)),
    ]
    expect(panics, panics.join('\n')).toEqual([])
    collector.detach()
  })
})
