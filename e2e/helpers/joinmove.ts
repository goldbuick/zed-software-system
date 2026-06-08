import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { type Page, expect } from '@playwright/test'

import type { ZssE2eBridge } from '../../zss/testsupport/e2escrollbridge'

import { exposehoststorage } from './hoststorage'

type WindowWithE2e = Window & { __zss_e2e?: ZssE2eBridge }

export function makedatadir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

export async function waitfore2ebridge(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      typeof (window as WindowWithE2e).__zss_e2e?.getscrollsnapshot ===
      'function',
    undefined,
    { timeout: 120_000 },
  )
}

export async function dismissmuteoverlay(page: Page): Promise<void> {
  try {
    await page.getByText('Click to un-mute', { exact: true }).click({
      timeout: 5000,
    })
  } catch {
    // Chromium often skips this overlay.
  }
}

export async function bootstraphostpage(
  page: Page,
  datadir: string,
  opts?: { hostmemtrace?: boolean },
): Promise<string> {
  await exposehoststorage(page, datadir)
  const traceqs = opts?.hostmemtrace ? '&ZSS_HOST_MEM_TRACE=1' : ''
  await page.goto(`/?ZSS_E2E=1${traceqs}`)
  // Host tab is CLI/headless (no #frame); join tab uses full UI.
  await waitfore2ebridge(page)
  await expect
    .poll(
      async () =>
        page.evaluate(() =>
          (window as WindowWithE2e).__zss_e2e!.hassimloaddone(),
        ),
      { timeout: 180_000, intervals: [250, 500, 1000, 2000] },
    )
    .toBe(true)
  let topic = ''
  await expect
    .poll(
      async () => {
        topic = await page.evaluate(() =>
          (window as WindowWithE2e).__zss_e2e!.getjointopic(),
        )
        return topic
      },
      { timeout: 120_000, intervals: [250, 500, 1000, 2000] },
    )
    .not.toBe('')
  return topic
}

export async function bootstrapjoinpage(
  page: Page,
  topic: string,
  opts?: { hostmemtrace?: boolean },
): Promise<void> {
  const traceqs = opts?.hostmemtrace ? '&ZSS_HOST_MEM_TRACE=1' : ''
  await page.goto(`/join/?ZSS_E2E=1${traceqs}#${topic}`)
  await expect(page.locator('#frame')).toBeVisible({ timeout: 120_000 })
  await waitfore2ebridge(page)
  await dismissmuteoverlay(page)
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const e = (window as WindowWithE2e).__zss_e2e
          return e?.isgadgetclientready() ?? false
        }),
      { timeout: 180_000, intervals: [250, 500, 1000, 2000] },
    )
    .toBe(true)
}

export async function waitjoinboardrunnerrun(page: Page): Promise<string> {
  let workstatus = ''
  await expect
    .poll(
      async () => {
        const state = await page.evaluate(() => {
          const e = (window as WindowWithE2e).__zss_e2e
          return {
            simload: e?.hassimloaddone() ?? false,
            gadgetready: e?.isgadgetclientready() ?? false,
            workstatus: e?.getworkstatus() ?? '',
          }
        })
        workstatus = state.workstatus
        return state.simload && state.gadgetready
      },
      { timeout: 180_000, intervals: [250, 500, 1000, 2000] },
    )
    .toBe(true)
  if (!workstatus) {
    workstatus = await page.evaluate(
      () =>
        (window as WindowWithE2e).__zss_e2e?.getworkstatus() || 'run joined',
    )
  }
  return workstatus
}

export async function waitplayersprite(
  page: Page,
): Promise<{ x: number; y: number }> {
  let sprite: { x: number; y: number } | undefined
  await expect
    .poll(
      async () => {
        sprite = await page.evaluate(() =>
          (window as WindowWithE2e).__zss_e2e!.getplayersprite(),
        )
        return sprite
      },
      { timeout: 60_000, intervals: [250, 500, 1000] },
    )
    .toBeTruthy()
  return sprite!
}

export async function attemptjoinmove(
  page: Page,
  dir: 'left' | 'right' | 'up' | 'down',
  count: number,
): Promise<void> {
  for (let i = 0; i < count; ++i) {
    await page.evaluate((direction) => {
      ;(window as WindowWithE2e).__zss_e2e!.sendmoveinput(direction)
    }, dir)
    await page.waitForTimeout(200)
  }
}
