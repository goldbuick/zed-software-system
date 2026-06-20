import { expect, test } from '@playwright/test'

import {
  attachwanixpaniccollector,
  WANIX_GOJS_PANIC_RE,
} from './helpers/wanixpanic'

test.describe('wanix basic-vm wanix-term iframe smoke', () => {
  test.describe.configure({ timeout: 600_000 })

  test('smoke-basic-vm-term-iframe.html under mock WebGL parent', async ({
    page,
  }) => {
    test.setTimeout(600_000)
    page.setDefaultTimeout(600_000)
    const collector = attachwanixpaniccollector(page)
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/wanix-iframe-smoke.html')
    await page.waitForFunction(
      () =>
        (window as Window & { __WANIX_IFRAME_SMOKE_OK__?: boolean }).__WANIX_IFRAME_SMOKE_OK__ ===
          true ||
        (window as Window & { __WANIX_IFRAME_SMOKE_ERROR__?: string }).__WANIX_IFRAME_SMOKE_ERROR__ !=
          null,
      { timeout: 600_000 },
    )

    const result = await page.evaluate(() => ({
      ok: (window as Window & { __WANIX_IFRAME_SMOKE_OK__?: boolean }).__WANIX_IFRAME_SMOKE_OK__ === true,
      error: (window as Window & { __WANIX_IFRAME_SMOKE_ERROR__?: string }).__WANIX_IFRAME_SMOKE_ERROR__,
      status: document.getElementById('status')?.textContent ?? '',
    }))

    const panics = [
      ...collector.filterpanics(),
      ...errors.filter((line) => WANIX_GOJS_PANIC_RE.test(line)),
    ]
    expect(panics, panics.join('\n')).toEqual([])
    expect(result.ok, result.status || result.error).toBe(true)
    collector.detach()
  })
})
