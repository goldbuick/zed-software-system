import { expect, test } from '@playwright/test'

import type { LangCompileBenchReport } from '../../zss/feature/lang/langcompilebench'
import type { ZssE2eBridge } from '../../zss/testsupport/e2escrollbridge'

type WindowWithE2e = Window & { __zss_e2e?: ZssE2eBridge }

const WASM_TS_RATIO: Record<string, number> = {
  drawdisplay: 2.0,
  short_go: 2.0,
  simple_chat_player: 1.25,
  duplicator: 1.25,
  player: 1.25,
}

test.describe('lang compile benchmark', () => {
  test.describe.configure({ timeout: 300_000 })

  test('TS vs WASM compile medians in same browser session', async ({
    page,
  }) => {
    await page.goto('/?ZSS_E2E=1')
    await expect(page.locator('#frame')).toBeVisible()
    await page.waitForFunction(
      () =>
        typeof (window as WindowWithE2e).__zss_e2e?.runlangcompilebench ===
        'function',
      undefined,
      { timeout: 120_000 },
    )

    const report = await page.evaluate(async () => {
      return (window as WindowWithE2e).__zss_e2e!.runlangcompilebench({
        iterations: 30,
        warmup: 5,
      })
    })

    // eslint-disable-next-line no-console
    console.log('\n' + report.table + '\n')

    assertbenchreport(report)
  })
})

function assertbenchreport(report: LangCompileBenchReport) {
  expect(report.rows.length).toBeGreaterThan(0)

  for (const row of report.rows) {
    const maxratio = WASM_TS_RATIO[row.id] ?? 1.25
    const allowed = row.ts.median * maxratio
    expect(
      row.wasm.median,
      `${row.id}: wasm median ${row.wasm.median.toFixed(3)}ms vs ts median ${row.ts.median.toFixed(3)}ms (p95 wasm ${row.wasm.p95.toFixed(3)}ms, p95 ts ${row.ts.p95.toFixed(3)}ms); allowed wasm ≤ ts×${maxratio}`,
    ).toBeLessThanOrEqual(allowed)
  }
}
