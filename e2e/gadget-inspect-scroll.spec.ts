import { expect, test } from '@playwright/test'

import type { ZssE2eBridge } from '../zss/testsupport/e2escrollbridge'

type WindowWithE2e = Window & { __zss_e2e?: ZssE2eBridge }

test.describe('gadget and inspect scrolls', () => {
  test.describe.configure({ timeout: 180_000 })

  async function waitfore2ebridge(page: import('@playwright/test').Page) {
    await page.goto('/?ZSS_E2E=1')
    await expect(page.locator('#frame')).toBeVisible()
    await page.waitForFunction(
      () =>
        typeof (window as WindowWithE2e).__zss_e2e?.getscrollsnapshot ===
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
  }

  test('memoryinspect area updates inspect scroll on client', async ({
    page,
  }) => {
    await waitfore2ebridge(page)
    await page.evaluate(() => {
      ;(window as WindowWithE2e).__zss_e2e!.runinspect(
        { x: 4, y: 11 },
        { x: 6, y: 13 },
      )
    })
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const snap = (
              window as WindowWithE2e
            ).__zss_e2e!.getscrollsnapshot()
            return { name: snap.scrollname, text: snap.lines.join('\n') }
          }),
        { timeout: 60_000 },
      )
      .toMatchObject({
        name: 'inspect',
        text: expect.stringMatching(/selected:\s*4,11\s*-\s*6,13/),
      })
  })

  test('cli gadget enables inspector', async ({ page }) => {
    await waitfore2ebridge(page)
    await page.evaluate(() => {
      ;(window as WindowWithE2e).__zss_e2e!.runcli('#gadget')
    })
    await expect
      .poll(
        async () =>
          page.evaluate(() =>
            (window as WindowWithE2e).__zss_e2e!.inspectorenabled(),
          ),
        { timeout: 30_000 },
      )
      .toBe(true)
  })

  test('inspector canvas drag completes memoryinspect scroll', async ({
    page,
  }) => {
    await waitfore2ebridge(page)
    await page.evaluate(() => {
      ;(window as WindowWithE2e).__zss_e2e!.runcli('#gadget')
    })
    await expect
      .poll(
        async () =>
          page.evaluate(() =>
            (window as WindowWithE2e).__zss_e2e!.inspectorenabled(),
          ),
        { timeout: 30_000 },
      )
      .toBe(true)

    const box = await page.locator('#frame').boundingBox()
    expect(box).toBeTruthy()
    const x0 = box!.x + box!.width * 0.48
    const y0 = box!.y + box!.height * 0.52
    await page.mouse.move(x0, y0)
    await page.mouse.down()
    await page.mouse.move(x0 + 48, y0 + 36)
    await page.mouse.up()

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const snap = (
              window as WindowWithE2e
            ).__zss_e2e!.getscrollsnapshot()
            return { name: snap.scrollname, text: snap.lines.join('\n') }
          }),
        { timeout: 30_000 },
      )
      .toMatchObject({
        name: 'inspect',
        text: expect.stringMatching(/selected:\s*\d+,\d+\s*-\s*\d+,\d+/),
      })
  })

  test('ctrl+h opens refscroll with menu content', async ({ page }) => {
    await waitfore2ebridge(page)
    await page.locator('#frame').click()
    await page.keyboard.press('Control+h')
    await expect
      .poll(
        async () =>
          page.evaluate(() =>
            (window as WindowWithE2e).__zss_e2e!.getscrollsnapshot(),
          ),
        { timeout: 60_000 },
      )
      .toMatchObject({
        scrollname: '#help or $meta+h',
      })
    const hascontrols = await page.evaluate(() => {
      const { lines } = (window as WindowWithE2e).__zss_e2e!.getscrollsnapshot()
      return lines.some((l) => l.includes('controls and'))
    })
    expect(hascontrols).toBe(true)
  })

  test('writetestscroll inspect title renders fixture lines', async ({
    page,
  }) => {
    await waitfore2ebridge(page)
    await page.evaluate(() => {
      ;(window as WindowWithE2e).__zss_e2e!.writetestscroll(
        'inspect',
        'fixture plain\n!e2e cmd arg;e2e-link',
        'refscroll',
      )
    })
    await expect
      .poll(
        async () =>
          page.evaluate(() =>
            (window as WindowWithE2e).__zss_e2e!.getscrollsnapshot(),
          ),
        { timeout: 60_000 },
      )
      .toMatchObject({
        scrollname: 'inspect',
      })
    const ok = await page.evaluate(() => {
      const { lines } = (window as WindowWithE2e).__zss_e2e!.getscrollsnapshot()
      return lines.includes('fixture plain') && lines.includes('e2e-link')
    })
    expect(ok).toBe(true)
  })
})
