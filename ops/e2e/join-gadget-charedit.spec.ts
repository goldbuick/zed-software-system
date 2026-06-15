import { expect, test } from '@playwright/test'

import type { ZssE2eBridge } from '../../zss/testsupport/e2escrollbridge'

import {
  attemptjoinmove,
  bootstraphostpage,
  bootstrapjoinpage,
  makedatadir,
  waitjoinboardrunnerrun,
} from './helpers/joinmove'

type WindowWithE2e = Window & { __zss_e2e?: ZssE2eBridge }

const INSPECT_P1 = { x: 4, y: 11 }
const INSPECT_P2 = { x: 6, y: 13 }
const PICKED_CHAR = 65

test.describe('join gadget rect charedit host corruption', () => {
  test.describe.configure({ timeout: 300_000 })

  test('join charedit on rect keeps host sim alive', async ({ page: host }) => {
    let hostcrashed = false
    host.on('crash', () => {
      hostcrashed = true
    })

    const datadir = makedatadir('zss-join-charedit-')
    const topic = await bootstraphostpage(host, datadir)

    const join = await host.context().newPage()
    await bootstrapjoinpage(join, topic)
    await waitjoinboardrunnerrun(join)

    await join.evaluate(() => {
      const e2e = (window as WindowWithE2e).__zss_e2e!
      e2e.enableinspector(true)
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
            const snap = (
              window as WindowWithE2e
            ).__zss_e2e!.getscrollsnapshot()
            return snap.scrollname
          }),
        { timeout: 60_000 },
      )
      .toBe('inspect')

    let batchchip = ''
    batchchip = await join.evaluate(
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
            () =>
              (window as WindowWithE2e).__zss_e2e!.getscrollsnapshot()
                .scrollname,
          ),
        { timeout: 60_000 },
      )
      .toBe('bulk set char')

    await join.evaluate(
      ({ chip, value }) => {
        ;(window as WindowWithE2e).__zss_e2e!.writepanelnumber(
          chip,
          'char',
          value,
        )
      },
      { chip: batchchip, value: PICKED_CHAR },
    )

    await attemptjoinmove(join, 'right', 8)

    await expect
      .poll(
        async () => {
          if (hostcrashed) {
            return false
          }
          return host.evaluate(
            () => (window as WindowWithE2e).__zss_e2e?.hostsimalive() ?? false,
          )
        },
        { timeout: 30_000, intervals: [250, 500, 1000] },
      )
      .toBe(true)

    expect(hostcrashed).toBe(false)

    await join.close()
  })
})
