import { expect, test } from '@playwright/test'

import type { ZssE2eBridge } from '../zss/testsupport/e2escrollbridge'

type WindowWithE2e = Window & { __zss_e2e?: ZssE2eBridge }

test.describe('wanix CLI integration', () => {
  test.describe.configure({ timeout: 180_000 })

  test('#wanix start → run hello.wasm prints smoke output', async ({
    page,
  }) => {
    await page.goto('/?ZSS_E2E=1')
    await expect(page.locator('#frame')).toBeVisible()

    await page.waitForFunction(
      () =>
        typeof (window as WindowWithE2e).__zss_e2e?.runwanixsmoke ===
        'function',
      undefined,
      { timeout: 120_000 },
    )

    await page.waitForFunction(
      () => (window as WindowWithE2e).__zss_e2e?.hostsimalive?.() === true,
      undefined,
      { timeout: 120_000 },
    )

    const report = await page.evaluate(async () => {
      return (window as WindowWithE2e).__zss_e2e!.runwanixsmoke(90_000)
    })

    // eslint-disable-next-line no-console
    console.log('\nwanix smoke report:\n', JSON.stringify(report, null, 2))

    expect(report.iframepresent, report.errormessage ?? 'iframe missing').toBe(
      true,
    )
    expect(report.sawstarted, report.logs.join('\n')).toBe(true)
    expect(report.sawruncmd, report.logs.join('\n')).toBe(true)
    expect(report.sawhello, report.logs.join('\n')).toBe(true)
    expect(report.sawexit, report.logs.join('\n')).toBe(true)
    expect(report.sawerror, report.logs.join('\n')).toBe(false)
  })
})
