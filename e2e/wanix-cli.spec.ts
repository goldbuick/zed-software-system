import { expect, test } from '@playwright/test'

import type { ZssE2eBridge } from '../zss/testsupport/e2escrollbridge'

type WindowWithE2e = Window & { __zss_e2e?: ZssE2eBridge }

test.describe('wanix CLI integration', () => {
  test.describe.configure({ timeout: 180_000 })

  test('drop hello.wasm prints smoke output', async ({ page }) => {
    await page.goto('/?ZSS_E2E=1')
    await expect(page.locator('#frame')).toBeVisible()

    await page.waitForFunction(
      () =>
        typeof (window as WindowWithE2e).__zss_e2e?.runwanixsmoke ===
        'function',
      undefined,
      { timeout: 120_000 },
    )

    try {
      await page.getByText('Click to un-mute', { exact: true }).click({
        timeout: 5000,
      })
    } catch {
      // Firefox-only overlay; Chromium skips.
    }

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const e = (window as WindowWithE2e).__zss_e2e!
            return e.hassimloaddone() || e.isgadgetclientready()
          }),
        { timeout: 180_000, intervals: [250, 500, 1000, 2000] },
      )
      .toBe(true)

    const report = await page.evaluate(async () => {
      return (window as WindowWithE2e).__zss_e2e!.runwanixsmoke(90_000)
    })

    // eslint-disable-next-line no-console
    console.log('\nwanix smoke report:\n', JSON.stringify(report, null, 2))

    expect(report.iframepresent, report.errormessage ?? 'iframe missing').toBe(
      true,
    )
    expect(report.sawsandbox, report.logs.join('\n')).toBe(true)
    expect(report.sawruncmd, report.logs.join('\n')).toBe(true)
    expect(report.sawhello, report.logs.join('\n')).toBe(true)
    expect(report.sawexit, report.logs.join('\n')).toBe(true)
    expect(report.sawerror, report.logs.join('\n')).toBe(false)
  })
})
