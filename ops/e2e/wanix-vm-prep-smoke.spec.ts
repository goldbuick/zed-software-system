import { expect, test } from '@playwright/test'

import {
  attachwanixpaniccollector,
  WANIX_GOJS_PANIC_RE,
} from './helpers/wanixpanic'

/**
 * Isolated upstream 0.4 basic-vm recipe — no ZSS host layer.
 * Gates whether wanix.wasm + CDN archives work in this browser build at all.
 */
test.describe('wanix basic-vm smoke page', () => {
  test.describe.configure({ timeout: 600_000 })

  test('smoke-basic-vm.html reaches ready without wasm panic', async ({
    page,
  }) => {
    const collector = attachwanixpaniccollector(page)
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/wanix/smoke-basic-vm.html')
    await page.waitForFunction(
      () =>
        (window as Window & { __WANIX_SMOKE_OK__?: boolean }).__WANIX_SMOKE_OK__ ===
          true ||
        (window as Window & { __WANIX_SMOKE_ERROR__?: string }).__WANIX_SMOKE_ERROR__ !=
          null,
      { timeout: 600_000 },
    )

    const result = await page.evaluate(() => ({
      ok: (window as Window & { __WANIX_SMOKE_OK__?: boolean }).__WANIX_SMOKE_OK__ === true,
      error: (window as Window & { __WANIX_SMOKE_ERROR__?: string }).__WANIX_SMOKE_ERROR__,
      log: document.getElementById('log')?.textContent ?? '',
    }))

    expect(result.ok, result.log).toBe(true)

    await page.waitForTimeout(60_000)

    const panics = [
      ...collector.filterpanics(),
      ...errors.filter((line) => WANIX_GOJS_PANIC_RE.test(line)),
    ]
    expect(panics, panics.join('\n')).toEqual([])
    collector.detach()
  })
})
