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
 * Headed manual repro: boots host+join with host memory tracing, then pauses
 * Playwright so you can drive inspect → charedit → move in the join UI.
 *
 * Logs: .cursor/debug-9bae57.log
 * Rebuild steps: yarn host-memory:repro:build
 */
test.describe('join charedit manual host memory trace', () => {
  test.describe.configure({ timeout: 3_600_000 })

  test('pause for manual join charedit repro', async ({ page: host }) => {
    test.skip(
      !process.env.PLAYWRIGHT_MANUAL_JOIN_CHAREDIT,
      'Set PLAYWRIGHT_MANUAL_JOIN_CHAREDIT=1',
    )

    const datadir = makedatadir('zss-join-charedit-manual-')
    const topic = await bootstraphostpage(host, datadir, { hostmemtrace: true })

    await host.evaluate(() => {
      ;(window as WindowWithE2e).__zss_e2e!.markhostmemorymilestone(
        'manual:host-ready',
        { url: location.href },
      )
    })

    const join = await host.context().newPage()
    await bootstrapjoinpage(join, topic, { hostmemtrace: true })
    await waitjoinboardrunnerrun(join)

    await join.evaluate(() => {
      const e2e = (window as WindowWithE2e).__zss_e2e!
      e2e.enableinspector(true)
      e2e.markhostmemorymilestone('manual:join-ready', {
        url: location.href,
      })
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

    await join.evaluate(() => {
      ;(window as WindowWithE2e).__zss_e2e!.markhostmemorymilestone(
        'manual:pause-before-repro',
        {
          hint: 'join tab: inspect rect → chars batch → charedit → move; host tab: watch terminal',
        },
      )
    })

    await join.pause()
  })
})
