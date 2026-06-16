import { expect, test } from '@playwright/test'

import type { ZssE2eBridge } from '../../zss/testsupport/e2escrollbridge'
import repro from '../fixtures/e2e/host-memory-repro.json'

import {
  bootstraphostpage,
  bootstrapjoinpage,
  makedatadir,
  waitjoinboardrunnerrun,
} from './helpers/joinmove'

type WindowWithE2e = Window & { __zss_e2e?: ZssE2eBridge }

const INSPECT_P1 = { x: 18, y: 4 }
const INSPECT_P2 = { x: 43, y: 13 }
const PICKED_CHAR = 179

/** Auto-generated from .cursor/debug-9bae57.log at 2026-06-08T03:13:26.478Z */
test.describe('host memory repro from log', () => {
  test.describe.configure({ timeout: 300_000 })

  test('replay logged join charedit sequence', async ({ page: host }) => {
    test.skip(
      !process.env.PLAYWRIGHT_HOST_MEMORY_REPRO,
      'Set PLAYWRIGHT_HOST_MEMORY_REPRO=1',
    )

    const datadir = makedatadir('zss-host-memory-repro-')
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

    await join.evaluate(
      ({ p1, p2 }) => {
        ;(window as WindowWithE2e).__zss_e2e!.runinspect(p1, p2)
      },
      { p1: INSPECT_P1, p2: INSPECT_P2 },
    )

    await expect
      .poll(
        async () =>
          join.evaluate(() => {
            return (window as WindowWithE2e).__zss_e2e!.getscrollsnapshot()
              .scrollname
          }),
        { timeout: 60_000 },
      )
      .toBe('inspect')

    const batchchip = await join.evaluate(
      ({ p1, p2 }) => {
        const e2e = (window as WindowWithE2e).__zss_e2e!
        e2e.sendbatchchip(`chars:${p1.x},${p1.y},${p2.x},${p2.y}`)
        return e2e.batchchipforrect(p1, p2)
      },
      { p1: INSPECT_P1, p2: INSPECT_P2 },
    )

    await expect
      .poll(
        async () =>
          join.evaluate(
            ({ chip }) => {
              const snap = (
                window as WindowWithE2e
              ).__zss_e2e!.getscrollsnapshot()
              return snap.lines.some((line) => line.includes(chip))
            },
            { chip: batchchip },
          ),
        { timeout: 60_000 },
      )
      .toBe(true)

    await join.evaluate(
      ({ chip, value }) => {
        const e2e = (window as WindowWithE2e).__zss_e2e!
        e2e.writepanelnumber(chip, 'char', value)
      },
      { chip: batchchip, value: PICKED_CHAR },
    )

    await join.evaluate(() => {
      ;(window as WindowWithE2e).__zss_e2e!.sendmoveinput('right')
    })

    await expect
      .poll(
        async () =>
          host.evaluate(() =>
            (window as WindowWithE2e).__zss_e2e!.hostsimalive(),
          ),
        { timeout: 30_000 },
      )
      .toBe(true)

    const hostdead = repro.steps.some((s) => s.kind === 'hostdead')
    if (hostdead) {
      console.warn(
        'Source log recorded host:sim:dead — replay expects corruption',
      )
    }
  })
})
