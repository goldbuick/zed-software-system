import { expect, test } from '@playwright/test'

import { HELLO_WASM_BYTE_LIST } from '../../zss/testsupport/wanix/hellowasm'
import { HOLD_WASM_BYTE_LIST } from '../../zss/testsupport/wanix/holdwasm'

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
          { type: 'wanix:run', id: runid, cmd: runcmd },
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
})
