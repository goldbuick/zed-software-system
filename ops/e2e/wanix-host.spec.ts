import { expect, test } from '@playwright/test'

import { readwanixruntimeurls } from '../../zss/feature/wanix/wanixvmassets'
import { HELLO_WASM_BYTE_LIST } from '../../zss/testsupport/wanix/hellowasm'
import { HOLD_WASM_BYTE_LIST } from '../../zss/testsupport/wanix/holdwasm'
import { TERM_BRIDGE_WASM_BYTE_LIST } from '../../zss/testsupport/wanix/termbridgewasm'

import {
  TERM_BLOCK_MS,
  runhostwasm,
  waitforwanixappbridge,
  waitforwanixhostready,
  waitforwanixvmbridge,
} from './helpers/wanixio'

import type { ZssE2eBridge } from '../../zss/testsupport/e2escrollbridge'

type WindowWithE2e = Window & { __zss_e2e?: ZssE2eBridge }

test.describe('wanix in-page host (e2e app)', () => {
  test.describe.configure({ timeout: 180_000 })

  test('loads runtime from jsDelivr CDN', async ({ request }) => {
    const { js, debugWasm } = readwanixruntimeurls()
    for (const url of [js, debugWasm]) {
      const res = await request.get(url)
      expect(res.ok(), `${url} should be reachable`).toBeTruthy()
    }
  })

  test('boots wanix-system, puts hello.wasm, and runs in-page', async ({
    page,
  }) => {
    const result = await runhostwasm(
      page,
      HELLO_WASM_BYTE_LIST,
      'hello.wasm',
      'hello.wasm',
    )

    expect(result.error, JSON.stringify(result, null, 2)).toBeUndefined()
    expect(result.code).toBe(0)
    expect(result.output).toContain('Hello from wanix!')
  })

  test('accepts wanix:term-write while hold.wasm task runs', async ({
    page,
  }) => {
    const result = await runhostwasm(
      page,
      HOLD_WASM_BYTE_LIST,
      'hold.wasm',
      'hold.wasm',
      { blockms: TERM_BLOCK_MS, termline: 'hello', haltafter: true },
    )

    expect(result.error, JSON.stringify(result, null, 2)).toBeUndefined()
    expect(result.termwritesucceeded, 'term-write should succeed').toBe(true)
  })

  test('termbridge.wasm prints via term-out and accepts wanix:term-write', async ({
    page,
  }) => {
    const result = await runhostwasm(
      page,
      TERM_BRIDGE_WASM_BYTE_LIST,
      'termbridge.wasm',
      'termbridge.wasm',
      { blockms: TERM_BLOCK_MS, termline: 'ping', haltafter: true },
    )

    expect(result.error, JSON.stringify(result, null, 2)).toBeUndefined()
    expect(result.output).toContain('wanix term bridge ready')
    expect(result.termwritesucceeded, 'term-write should succeed').toBe(true)
  })

  test('runs hello.wasm in parallel while hold.wasm keeps running', async ({
    page,
  }) => {
    await waitforwanixhostready(page)
    const result = await page.evaluate(
      async ({ hellobytes, holdbytes }) => {
        const e = (window as WindowWithE2e).__zss_e2e!
        await e.putwanixhostfile('hold.wasm', holdbytes)
        await e.putwanixhostfile('hello.wasm', hellobytes)
        const holdstart = await e.spawnwanixhosttask('hold.wasm', {
          wait: false,
          attach: true,
        })
        const helloresult = await e.spawnwanixhosttask('hello.wasm', {
          wait: true,
          attach: true,
        })
        const output = e.readwanixhostserial()
        if (helloresult.code !== 0) {
          return { error: `hello exit ${helloresult.code}`, output }
        }
        if (!output.includes('Hello from wanix!')) {
          return { error: 'missing hello output', output }
        }
        await e.attachwanixhosttarget('task', holdstart.taskid)
        await e.sendwanixhosttermwrite('hello')
        await e.haltwanixhosttask(holdstart.taskid)
        return { code: 0, output, holdtaskid: holdstart.taskid }
      },
      {
        hellobytes: HELLO_WASM_BYTE_LIST,
        holdbytes: HOLD_WASM_BYTE_LIST,
      },
    )

    expect(result.error, JSON.stringify(result, null, 2)).toBeUndefined()
    expect(result.code).toBe(0)
  })
})

const includevme2e = process.env.PLAYWRIGHT_INCLUDE_WANIX_VM_E2E === '1'

const VM_ASSET_URLS = {
  linux: 'https://cdn.jsdelivr.net/npm/wanix-extras@0.4.0-rc1/dist/wanix-linux.tgz',
  v86: 'https://cdn.jsdelivr.net/npm/wanix-extras@0.4.0-rc1/dist/v86.tgz',
}

test.describe('wanix vm boot (gated)', () => {
  test.skip(!includevme2e, 'set PLAYWRIGHT_INCLUDE_WANIX_VM_E2E=1')

  test.describe.configure({ timeout: 600_000, mode: 'serial' })

  test('vm-prep only reaches mount ok', async ({ page }) => {
    test.setTimeout(180_000)
    await waitforwanixvmbridge(page)
    const result = await page.evaluate(async (asseturls) => {
      const e = (window as WindowWithE2e).__zss_e2e!
      try {
        await e.prepwanixhostvm(asseturls)
        const entries = await e.listwanixhostdir('#vm/v86')
        return {
          ok: entries.includes('v86-vm.wasm'),
          entries,
        }
      } catch (err) {
        return {
          ok: false,
          entries: [] as string[],
          error: err instanceof Error ? err.message : String(err),
        }
      }
    }, VM_ASSET_URLS)

    expect(result.error, JSON.stringify(result, null, 2)).toBeUndefined()
    expect(result.ok, `entries: ${result.entries?.join(', ')}`).toBe(true)
  })

  test('vm-prep and vm-run emit serial console output', async ({ page }) => {
    await waitforwanixvmbridge(page)
    const result = await page.evaluate(async (asseturls) => {
      const e = (window as WindowWithE2e).__zss_e2e!
      try {
        await e.prepwanixhostvm(asseturls)
        const entries = await e.listwanixhostdir('#vm/v86')
        if (!entries.includes('v86-vm.wasm')) {
          return {
            error: `missing v86-vm.wasm (entries: ${entries.join(', ')})`,
            output: '',
            serialok: false,
          }
        }
        const vm = await e.spawnwanixhostvm({
          vmid: 'linux-vm',
          attach: true,
          wait: false,
        })
        let output = ''
        const deadline = Date.now() + 300_000
        while (Date.now() < deadline) {
          output = e.readwanixhostserial()
          if (output.length > 0) {
            break
          }
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
        await e.haltwanixhostvm(vm.vmid)
        return { vmId: vm.vmid, serialok: output.length > 0, output }
      } catch (err) {
        return {
          error: err instanceof Error ? err.message : String(err),
          output: '',
          serialok: false,
        }
      }
    }, VM_ASSET_URLS)

    expect(result.error, JSON.stringify(result, null, 2)).toBeUndefined()
    expect(result.serialok, 'expected serial term-out from vm').toBe(true)
    expect(result.output?.length ?? 0).toBeGreaterThan(0)
  })

  test('vm accepts per-char term-input after login prompt', async ({ page }) => {
    await waitforwanixvmbridge(page)
    const result = await page.evaluate(async (asseturls) => {
      const e = (window as WindowWithE2e).__zss_e2e!
      await e.prepwanixhostvm(asseturls)
      const vm = await e.spawnwanixhostvm({
        vmid: 'linux-vm-input',
        attach: true,
        wait: false,
      })
      let output = ''
      const bootdeadline = Date.now() + 240_000
      while (Date.now() < bootdeadline) {
        output = e.readwanixhostserial()
        if (output.includes('~ #') || output.includes('login:')) {
          break
        }
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
      if (!output.includes('~ #') && !output.includes('login:')) {
        await e.haltwanixhostvm(vm.vmid)
        return { error: 'vm boot prompt not seen', output, inputok: false }
      }
      const before = output.length
      await e.sendwanixhostterminput('echo zss-e2e\r')
      await e.sendwanixhostterminput('echo second-line\r')
      const writedeadline = Date.now() + 30_000
      while (Date.now() < writedeadline) {
        output = e.readwanixhostserial()
        if (output.length > before) {
          break
        }
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
      await e.haltwanixhostvm(vm.vmid)
      return {
        vmId: vm.vmid,
        output,
        inputok: output.length > before,
      }
    }, VM_ASSET_URLS)

    expect(result.error, JSON.stringify(result, null, 2)).toBeUndefined()
    expect(result.inputok, 'term-input should produce serial output').toBe(true)
  })
})
