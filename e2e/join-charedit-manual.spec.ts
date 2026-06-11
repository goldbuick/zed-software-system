import { expect, test } from '@playwright/test'

import type { ZssE2eBridge } from '../zss/testsupport/e2escrollbridge'

import {
  bootstraphostpage,
  bootstrapjoinpage,
  makedatadir,
  waitjoinboardrunnerrun,
} from './helpers/joinmove'

type WindowWithE2e = Window & { __zss_e2e?: ZssE2eBridge }

/**
 * Headed manual repro: boots host+join, then pauses Playwright so you can
 * drive inspect → charedit → move in the join UI.
 */
test.describe('join charedit manual repro', () => {
  test.describe.configure({ timeout: 3_600_000 })

  test('pause for manual join charedit repro', async ({ page: host }) => {
    test.skip(
      !process.env.PLAYWRIGHT_MANUAL_JOIN_CHAREDIT,
      'Set PLAYWRIGHT_MANUAL_JOIN_CHAREDIT=1',
    )

    const datadir = makedatadir('zss-join-charedit-manual-')
    const topic = await bootstraphostpage(host, datadir)

    const join = await host.context().newPage()
    await bootstrapjoinpage(join, topic)
    await waitjoinboardrunnerrun(join)

    await join.evaluate(() => {
      ;(window as WindowWithE2e).__zss_e2e!.enableinspector(true)
    })

    await expect
      .poll(
        async () =>
          join.evaluate(() =>
            (window as WindowWithE2e).__zss_e2e!.inspectorenabled(),
          ),
        { timeout: 30_000 },
      )
      .toBe(true)

    await join.pause()
  })
})
