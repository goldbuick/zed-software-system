/** Helpers for wanix in-page host e2e (term bridge + binds). */
import type { Page } from '@playwright/test'

import type { ZssE2eBridge } from '../../zss/testsupport/e2escrollbridge'

export const TERM_BLOCK_MS = 800

export type WanixHostRunResult = {
  code: number
  error?: string
  output: string
  termwritesucceeded?: boolean
}

type WindowWithE2e = Window & { __zss_e2e?: ZssE2eBridge }

export async function bootwanixappe2e(page: Page): Promise<void> {
  await page.goto('/?ZSS_E2E=1')
  await page.waitForFunction(
    () =>
      typeof (window as WindowWithE2e).__zss_e2e?.ensurewanixhostready ===
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
}

/** Wanix vm e2e — no R3F canvas (matches smoke-basic-vm GL isolation). */
export async function bootwanixvme2e(page: Page): Promise<void> {
  await page.goto('/?ZSS_E2E=1&ZSS_WANIX_VM=1')
  await page.waitForFunction(
    () => typeof (window as WindowWithE2e).__zss_e2e?.prepwanixhostvm === 'function',
    undefined,
    { timeout: 120_000 },
  )
}

export async function waitforwanixhostready(page: Page): Promise<void> {
  await bootwanixappe2e(page)
  await page.evaluate(async () => {
    await (window as WindowWithE2e).__zss_e2e!.ensurewanixhostready()
  })
}

/** E2e bridge only — do not boot #ramfs before vm prep (second Go WASM breaks archive mount). */
export async function waitforwanixappbridge(page: Page): Promise<void> {
  await bootwanixappe2e(page)
}

/** Vm e2e — minimal boot without gadget WebGL canvas. */
export async function waitforwanixvmbridge(page: Page): Promise<void> {
  await bootwanixvme2e(page)
}

export async function runhostwasm(
  page: Page,
  wasmbytes: number[],
  name: string,
  cmd: string,
  opts?: {
    termline?: string
    blockms?: number
    haltafter?: boolean
  },
): Promise<WanixHostRunResult> {
  await bootwanixappe2e(page)
  return page.evaluate(
    async ({ bytes, wasmname, runcmd, blockwait, line, halt }) => {
      const e = (window as WindowWithE2e).__zss_e2e!
      await e.ensurewanixhostready()
      return e.runwanixhostwasm(wasmname, bytes, runcmd, {
        termline: line,
        blockms: blockwait,
        haltafter: halt,
      })
    },
    {
      bytes: wasmbytes,
      wasmname: name,
      runcmd: cmd,
      blockwait: opts?.blockms ?? 0,
      line: opts?.termline,
      halt: opts?.haltafter ?? false,
    },
  )
}
