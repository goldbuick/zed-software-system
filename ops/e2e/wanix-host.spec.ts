import { expect, test } from '@playwright/test'

import { HELLO_WASM_BYTE_LIST } from '../../zss/testsupport/wanix/hellowasm'
import { HOLD_WASM_BYTE_LIST } from '../../zss/testsupport/wanix/holdwasm'
import { TERM_BRIDGE_WASM_BYTE_LIST } from '../../zss/testsupport/wanix/termbridgewasm'

import {
  TERM_BLOCK_MS,
  type WanixHostRunResult,
  waitforwanixhostready,
} from './helpers/wanixio'

async function runhostwasm(
  page: Parameters<typeof waitforwanixhostready>[0],
  wasmbytes: number[],
  name: string,
  cmd: string,
  opts?: {
    termline?: string
    blockms?: number
    haltafter?: boolean
  },
): Promise<WanixHostRunResult> {
  await waitforwanixhostready(page)
  const blockms = opts?.blockms ?? 0
  const termline = opts?.termline

  return page.evaluate(
    async ({ bytes, wasmname, runcmd, blockwait, line, halt }) => {
      const origin = location.origin
      const wasmbuffer = new Uint8Array(bytes).buffer

      const rpc = (
        type: string,
        data: Record<string, unknown>,
        done: string,
        rpcid: string,
      ) =>
        new Promise<{ error?: string }>((resolve) => {
          const timer = setTimeout(
            () => resolve({ error: `${type} timeout` }),
            60_000,
          )
          window.addEventListener('message', function onmsg(ev: MessageEvent) {
            if (ev.origin !== origin) {
              return
            }
            if (ev.data?.type === done && ev.data.id === rpcid) {
              clearTimeout(timer)
              window.removeEventListener('message', onmsg)
              resolve({ error: ev.data.error })
            }
          })
          window.postMessage({ type, id: rpcid, ...data }, origin)
        })

      const putreply = await rpc(
        'wanix:put',
        { name: wasmname, bytes: wasmbuffer },
        'wanix:put:done',
        `e2e-put-${wasmname}`,
      )
      if (putreply.error) {
        return {
          code: -1,
          error: putreply.error,
          output: '',
        }
      }

      let output = ''
      const runid = `e2e-run-${wasmname}`
      let rundone = false
      const runpromise = new Promise<{
        code: number
        error?: string
      }>((resolve) => {
        const timer = setTimeout(
          () => resolve({ code: -1, error: 'run timeout' }),
          60_000,
        )
        window.addEventListener('message', function onmsg(ev: MessageEvent) {
          if (ev.origin !== origin) {
            return
          }
          if (ev.data?.type === 'wanix:term-out' && ev.data.chunk) {
            output += String(ev.data.chunk)
          }
          if (ev.data?.type === 'wanix:log' && ev.data.line) {
            output += `${String(ev.data.line)}\n`
          }
          if (ev.data?.type === 'wanix:run:done' && ev.data.id === runid) {
            rundone = true
            clearTimeout(timer)
            window.removeEventListener('message', onmsg)
            resolve({
              code: typeof ev.data.code === 'number' ? ev.data.code : 1,
              error: ev.data.error,
            })
          }
        })
        window.postMessage(
          { type: 'wanix:run', id: runid, cmd: runcmd, wait: true },
          origin,
        )
      })

      await new Promise((resolve) => setTimeout(resolve, blockwait))

      let termwritesucceeded = false
      if (line != null) {
        const termreply = await rpc(
          'wanix:term-write',
          { data: line },
          'wanix:term-write:done',
          `e2e-term-${wasmname}`,
        )
        termwritesucceeded = !termreply.error
        if (termreply.error) {
          if (halt) {
            await rpc('wanix:halt', {}, 'wanix:halt:done', `e2e-halt-${wasmname}`)
          }
          return {
            code: -1,
            error: termreply.error,
            output,
            termwritesucceeded,
          }
        }
      }

      if (halt) {
        await rpc('wanix:halt', {}, 'wanix:halt:done', `e2e-halt-${wasmname}`)
        await runpromise.catch(() => ({ code: -1, error: 'halted' }))
        return {
          code: 0,
          output,
          termwritesucceeded,
        }
      }

      const runresult = await runpromise
      return {
        ...runresult,
        output,
        termwritesucceeded,
      }
    },
    {
      bytes: wasmbytes,
      wasmname: name,
      runcmd: cmd,
      blockwait: blockms,
      line: termline,
      halt: opts?.haltafter ?? false,
    },
  )
}

test.describe('wanix host page (isolated)', () => {
  test.describe.configure({ timeout: 180_000 })

  test('vends runtime assets', async ({ request }) => {
    for (const path of [
      '/wanix/host.html',
      '/wanix/wanix.wasm',
      '/wanix/wanix.min.js',
    ]) {
      const res = await request.get(path)
      expect(res.ok(), `${path} should be served`).toBeTruthy()
    }
  })

  test('boots wanix-system, puts hello.wasm, and runs via postMessage', async ({
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
        const origin = location.origin
        const rpc = (
          type: string,
          data: Record<string, unknown>,
          done: string,
          rpcid: string,
        ) =>
          new Promise<{ error?: string; taskId?: string; code?: number }>(
            (resolve) => {
              const timer = setTimeout(
                () => resolve({ error: `${type} timeout` }),
                60_000,
              )
              window.addEventListener('message', function onmsg(ev: MessageEvent) {
                if (ev.origin !== origin) {
                  return
                }
                if (ev.data?.type === done && ev.data.id === rpcid) {
                  clearTimeout(timer)
                  window.removeEventListener('message', onmsg)
                  resolve({
                    error: ev.data.error,
                    taskId: ev.data.taskId,
                    code: ev.data.code,
                  })
                }
              })
              window.postMessage({ type, id: rpcid, ...data }, origin)
            },
          )

        for (const [name, bytes] of [
          ['hold.wasm', holdbytes],
          ['hello.wasm', hellobytes],
        ] as const) {
          const put = await rpc(
            'wanix:put',
            { name, bytes: new Uint8Array(bytes).buffer },
            'wanix:put:done',
            `e2e-put-${name}`,
          )
          if (put.error) {
            return { error: put.error }
          }
        }

        const holdstart = await rpc(
          'wanix:run',
          { cmd: 'hold.wasm', wait: false },
          'wanix:run:started',
          'e2e-hold-start',
        )
        if (holdstart.error || !holdstart.taskId) {
          return { error: holdstart.error ?? 'hold start missing taskId' }
        }

        let output = ''
        const hellopromise = new Promise<{ code: number; error?: string }>(
          (resolve) => {
            const timer = setTimeout(
              () => resolve({ code: -1, error: 'hello timeout' }),
              60_000,
            )
            window.addEventListener('message', function onmsg(ev: MessageEvent) {
              if (ev.origin !== origin) {
                return
              }
              if (ev.data?.type === 'wanix:term-out' && ev.data.chunk) {
                output += String(ev.data.chunk)
              }
              if (
                ev.data?.type === 'wanix:run:done' &&
                ev.data.id === 'e2e-hello-run'
              ) {
                clearTimeout(timer)
                window.removeEventListener('message', onmsg)
                resolve({
                  code: typeof ev.data.code === 'number' ? ev.data.code : 1,
                  error: ev.data.error,
                })
              }
            })
            window.postMessage(
              {
                type: 'wanix:run',
                id: 'e2e-hello-run',
                cmd: 'hello.wasm',
                wait: true,
              },
              origin,
            )
          },
        )

        const helloresult = await hellopromise
        if (helloresult.error) {
          return { error: helloresult.error, output }
        }
        if (helloresult.code !== 0) {
          return { error: `hello exit ${helloresult.code}`, output }
        }
        if (!output.includes('Hello from wanix!')) {
          return { error: 'missing hello output', output }
        }

        const attach = await rpc(
          'wanix:attach',
          { taskId: holdstart.taskId },
          'wanix:attach:done',
          'e2e-hold-attach',
        )
        if (attach.error) {
          return { error: attach.error, output }
        }

        const term = await rpc(
          'wanix:term-write',
          { data: 'hello' },
          'wanix:term-write:done',
          'e2e-hold-term',
        )
        if (term.error) {
          return { error: term.error, output }
        }

        const halt = await rpc(
          'wanix:halt',
          { taskId: holdstart.taskId },
          'wanix:halt:done',
          'e2e-hold-halt',
        )
        if (halt.error) {
          return { error: halt.error, output }
        }

        return { code: 0, output, holdtaskid: holdstart.taskId }
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

test.describe('wanix vm boot (gated)', () => {
  test.skip(!includevme2e, 'set PLAYWRIGHT_INCLUDE_WANIX_VM_E2E=1')

  test.describe.configure({ timeout: 600_000 })

  test('vm-prep and vm-run emit serial console output', async ({ page }) => {
    const urls = {
      linux: 'https://cdn.jsdelivr.net/npm/wanix-extras@0.4.0-rc1/dist/wanix-linux.tgz',
      v86: 'https://cdn.jsdelivr.net/npm/wanix-extras@0.4.0-rc1/dist/v86.tgz',
    }
    await waitforwanixhostready(page)
    const result = await page.evaluate(async (asseturls) => {
      const origin = location.origin
      const rpc = (
        type: string,
        data: Record<string, unknown>,
        done: string,
        rpcid: string,
        timeoutms: number,
      ) =>
        new Promise<{
          error?: string
          vmId?: string
          entries?: string[]
        }>((resolve) => {
          const timer = setTimeout(
            () => resolve({ error: `${type} timeout` }),
            timeoutms,
          )
          window.addEventListener('message', function onmsg(ev: MessageEvent) {
            if (ev.origin !== origin) {
              return
            }
            if (ev.data?.type === done && ev.data.id === rpcid) {
              clearTimeout(timer)
              window.removeEventListener('message', onmsg)
              resolve({
                error: ev.data.error,
                vmId: ev.data.vmId,
                entries: Array.isArray(ev.data.entries)
                  ? ev.data.entries.map(String)
                  : undefined,
              })
            }
          })
          window.postMessage({ type, id: rpcid, ...data }, origin)
        })

      const prep = await rpc(
        'wanix:vm-prep',
        { urls: asseturls },
        'wanix:vm-prep:done',
        'e2e-vm-prep',
        600_000,
      )
      if (prep.error) {
        return { error: prep.error, output: '' }
      }

      const driverls = await rpc(
        'wanix:ls',
        { path: '#vm/v86' },
        'wanix:ls:done',
        'e2e-vm-v86-ls',
        60_000,
      )
      if (driverls.error) {
        return { error: driverls.error, output: '' }
      }
      if (!driverls.entries?.includes('v86-vm.wasm')) {
        return {
          error: `missing v86-vm.wasm after prep (entries: ${driverls.entries?.join(', ') ?? 'none'})`,
          output: '',
        }
      }

      let output = ''
      const runid = 'e2e-vm-run'
      const runstart = await rpc(
        'wanix:vm-run',
        { vmId: 'linux-vm', wait: false, attach: true },
        'wanix:vm-run:started',
        runid,
        600_000,
      )
      if (runstart.error || !runstart.vmId) {
        return {
          error: runstart.error ?? 'vm run missing vmId',
          output,
        }
      }

      const serial = await new Promise<{ ok: boolean; output: string }>(
        (resolve) => {
          const deadline = Date.now() + 180_000
          const timer = setInterval(() => {
            if (Date.now() >= deadline) {
              clearInterval(timer)
              window.removeEventListener('message', onmsg)
              resolve({ ok: output.length > 0, output })
            }
          }, 500)
          function onmsg(ev: MessageEvent) {
            if (ev.origin !== origin) {
              return
            }
            if (ev.data?.type === 'wanix:term-out' && ev.data.chunk) {
              output += String(ev.data.chunk)
            }
            if (ev.data?.type === 'wanix:log' && ev.data.line) {
              output += `${String(ev.data.line)}\n`
            }
            if (output.length > 0) {
              clearInterval(timer)
              window.removeEventListener('message', onmsg)
              resolve({ ok: true, output })
            }
          }
          window.addEventListener('message', onmsg)
        },
      )

      await rpc(
        'wanix:vm-halt',
        { vmId: runstart.vmId },
        'wanix:vm-halt:done',
        'e2e-vm-halt',
        60_000,
      )

      return {
        vmId: runstart.vmId,
        serialok: serial.ok,
        output: serial.output,
      }
    }, urls)

    expect(result.error, JSON.stringify(result, null, 2)).toBeUndefined()
    expect(result.serialok, 'expected serial term-out from vm').toBe(true)
    expect(result.output?.length ?? 0).toBeGreaterThan(0)
  })
})
