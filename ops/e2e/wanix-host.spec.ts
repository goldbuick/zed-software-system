import { expect, test } from '@playwright/test'

import { ECHO_STDIN_WASM_BYTE_LIST } from '../../zss/testsupport/wanix/echostdin'
import { HELLO_REPL_WASM_BYTE_LIST } from '../../zss/testsupport/wanix/helloreplwasm'
import { HELLO_WASM_BYTE_LIST } from '../../zss/testsupport/wanix/hellowasm'

import {
  EMPTY_GREET_PATTERN,
  STDIN_BLOCK_MS,
  type WanixHostRunResult,
  waitforwanixhostready,
} from './helpers/wanixstdin'

async function runhostwasm(
  page: Parameters<typeof waitforwanixhostready>[0],
  wasmbytes: number[],
  name: string,
  cmd: string,
  opts?: {
    stdinlines?: string[]
    blockms?: number
  },
): Promise<WanixHostRunResult> {
  await waitforwanixhostready(page)
  const blockms = opts?.blockms ?? STDIN_BLOCK_MS
  const stdinlines = opts?.stdinlines ?? []

  return page.evaluate(
    async ({ bytes, wasmname, runcmd, blockwait, inputs }) => {
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
          lines: [],
          blocked: false,
        }
      }

      const lines: string[] = []
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
          if (ev.data?.type === 'wanix:log' && ev.data.line) {
            lines.push(String(ev.data.line))
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
          { type: 'wanix:run', id: runid, cmd: runcmd },
          origin,
        )
      })

      await new Promise((resolve) => setTimeout(resolve, blockwait))
      const blocked = !rundone
      const joined = lines.join('\n')
      const sawemptygreet = /Hello,\s*!/.test(joined)

      for (let i = 0; i < inputs.length; i++) {
        const stdinreply = await rpc(
          'wanix:stdin',
          { data: inputs[i] },
          'wanix:stdin:done',
          `e2e-stdin-${wasmname}-${i}`,
        )
        if (stdinreply.error) {
          return {
            code: -1,
            error: stdinreply.error,
            lines,
            blocked,
            sawemptygreet,
          }
        }
        if (i + 1 < inputs.length) {
          await new Promise((resolve) => setTimeout(resolve, 400))
        }
      }

      const runresult = await runpromise
      return {
        ...runresult,
        lines,
        blocked,
        sawemptygreet,
      }
    },
    {
      bytes: wasmbytes,
      wasmname: name,
      runcmd: cmd,
      blockwait: blockms,
      inputs: stdinlines,
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
      { blockms: 0, stdinlines: [] },
    )

    expect(result.error, JSON.stringify(result, null, 2)).toBeUndefined()
    expect(result.code).toBe(0)
    expect(result.lines.join('\n')).toContain('Hello from wanix!')
  })

  test('runs echo_stdin.wasm and accepts stdin via postMessage', async ({
    page,
  }) => {
    const result = await runhostwasm(
      page,
      ECHO_STDIN_WASM_BYTE_LIST,
      'echo_stdin.wasm',
      'echo_stdin.wasm',
      { stdinlines: ['hello'] },
    )

    expect(result.error, JSON.stringify(result, null, 2)).toBeUndefined()
    expect(result.blocked, 'task should block on fd_read before stdin').toBe(
      true,
    )
    expect(result.code).toBe(0)
    expect(result.lines.join('\n')).toContain('echo: hello')
  })

  test('runs hello-repl.wasm and accepts two stdin lines via postMessage', async ({
    page,
  }) => {
    const result = await runhostwasm(
      page,
      HELLO_REPL_WASM_BYTE_LIST,
      'hello-repl.wasm',
      'hello-repl.wasm',
      { stdinlines: ['alice', 'world'] },
    )

    expect(result.error, JSON.stringify(result, null, 2)).toBeUndefined()
    expect(result.blocked, 'task should block before first stdin').toBe(true)
    expect(
      result.sawemptygreet,
      'must not greet with empty name before stdin',
    ).toBe(false)
    expect(result.code).toBe(0)
    const joined = result.lines.join('\n')
    expect(joined).not.toMatch(EMPTY_GREET_PATTERN)
    expect(joined).toContain('Hello, alice')
    expect(joined).toContain('You said: world')
  })
})
