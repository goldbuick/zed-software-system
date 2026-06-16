import { expect, test } from '@playwright/test'

import {
  attemptjoinmove,
  bootstraphostpage,
  bootstrapjoinpage,
  makedatadir,
  waitjoinboardrunnerrun,
  waitplayersprite,
} from './helpers/joinmove'

test.describe('join boardrunner movement', () => {
  test.describe.configure({ timeout: 300_000 })

  test('host publishes topic; join player moves on own board', async ({
    page: host,
  }) => {
    const datadir = makedatadir('zss-join-host-')
    const topic = await bootstraphostpage(host, datadir)

    const join = await host.context().newPage()
    await bootstrapjoinpage(join, topic)
    const workstatus = await waitjoinboardrunnerrun(join)
    expect(workstatus).toMatch(/^run/)

    const before = await waitplayersprite(join)
    await attemptjoinmove(join, 'right', 8)

    await expect
      .poll(
        async () => {
          const after = await join.evaluate(() => {
            const w = window as Window & {
              __zss_e2e?: {
                getplayersprite: () => { x: number; y: number } | undefined
              }
            }
            return w.__zss_e2e?.getplayersprite()
          })
          return after?.x ?? before.x
        },
        { timeout: 60_000, intervals: [250, 500, 1000] },
      )
      .toBeGreaterThan(before.x)

    const afterstatus = await join.evaluate(() => {
      const w = window as Window & {
        __zss_e2e?: { getworkstatus: () => string }
      }
      return w.__zss_e2e?.getworkstatus() ?? ''
    })
    expect(afterstatus).toMatch(/^run /)

    await join.close()
  })
})
