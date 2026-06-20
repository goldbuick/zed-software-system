import { expect, test } from '@playwright/test'

import {
  attachwanixpaniccollector,
  WANIX_GOJS_PANIC_RE,
} from './helpers/wanixpanic'
import {
  VM_ASSET_URLS,
  waitforwanixappbridge,
  waitforwanixvmbridge,
} from './helpers/wanixio'

import type { ZssE2eBridge } from '../../zss/testsupport/e2escrollbridge'

type WindowWithE2e = Window & { __zss_e2e?: ZssE2eBridge }

const includevme2e = process.env.PLAYWRIGHT_INCLUDE_WANIX_VM_E2E === '1'

function expectnogojspanic(panics: string[], context: string) {
  const hits = panics.filter((line) => WANIX_GOJS_PANIC_RE.test(line))
  expect(hits, `${context}\n\n${hits.join('\n\n')}`).toEqual([])
}

test.describe('wanix vm full ZSS app (gated)', () => {
  test.skip(!includevme2e, 'set PLAYWRIGHT_INCLUDE_WANIX_VM_E2E=1')

  test.describe.configure({ timeout: 600_000, mode: 'serial' })

  test('hidden iframe wanix-term spawn has no gojs panic on full app', async ({
    page,
  }) => {
    const collector = attachwanixpaniccollector(page)
    await waitforwanixappbridge(page)

    const spawn = await page.evaluate(async (asseturls) => {
      const e = (window as WindowWithE2e).__zss_e2e!
      try {
        await e.prepwanixhostvm(asseturls)
        const vm = await e.spawnwanixhostvm({
          vmid: 'linux-vm',
          attach: true,
          wait: false,
        })
        return { vmid: vm.vmid, error: undefined as string | undefined }
      } catch (err) {
        return {
          vmid: undefined,
          error: err instanceof Error ? err.message : String(err),
        }
      }
    }, VM_ASSET_URLS)

    expect(spawn.error, spawn.error).toBeUndefined()
    await page.waitForTimeout(15_000)
    expectnogojspanic(collector.filterpanics(), 'after iframe spawn + 15s settle')
    collector.detach()

    await page.evaluate(async (vmid) => {
      const e = (window as WindowWithE2e).__zss_e2e!
      if (vmid) {
        await e.haltwanixhostvm(vmid)
      }
    }, spawn.vmid)
  })

  test('full app survives uname --help then id (term stress)', async ({
    page,
  }) => {
    test.setTimeout(900_000)
    const collector = attachwanixpaniccollector(page)
    await waitforwanixappbridge(page)

    const result = await page.evaluate(async (asseturls) => {
      const e = (window as WindowWithE2e).__zss_e2e!
      return e.runwanixvmtermstress(asseturls)
    }, VM_ASSET_URLS)

    expectnogojspanic(collector.filterpanics(), 'during term stress')
    collector.detach()

    expect(result.errormessage, JSON.stringify(result, null, 2)).toBeUndefined()
    expect(result.ok, JSON.stringify(result, null, 2)).toBe(true)
    expect(result.sawprompt).toBe(true)
    expect(result.sawunamehelp).toBe(true)
    expect(result.sawid).toBe(true)
  })
})

test.describe('wanix vm isolated page (gated baseline)', () => {
  test.skip(!includevme2e, 'set PLAYWRIGHT_INCLUDE_WANIX_VM_E2E=1')

  test.describe.configure({ timeout: 600_000 })

  test('isolated wanix-vm-e2e.html survives term stress', async ({ page }) => {
    const collector = attachwanixpaniccollector(page)
    await waitforwanixvmbridge(page)

    const result = await page.evaluate(async (asseturls) => {
      const e = (window as WindowWithE2e).__zss_e2e!
      return e.runwanixvmtermstress(asseturls)
    }, VM_ASSET_URLS)

    expectnogojspanic(collector.filterpanics(), 'isolated page term stress')
    collector.detach()

    expect(result.errormessage, JSON.stringify(result, null, 2)).toBeUndefined()
    expect(result.ok, JSON.stringify(result, null, 2)).toBe(true)
  })
})
