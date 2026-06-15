import { expect, test } from '@playwright/test'

import { HELLO_WASM_BYTE_LIST } from '../zss/testsupport/wanix/hellowasm'
import { ECHO_STDIN_WASM_BYTE_LIST } from '../zss/testsupport/wanix/echostdin'

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
    await page.goto('/wanix/host.html')

    await page.waitForFunction(
      () => document.querySelector('wanix-system') != null,
      undefined,
      { timeout: 120_000 },
    )

    await page.evaluate(async () => {
      const origin = location.origin
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('wanix:ready timeout')),
          120_000,
        )
        window.addEventListener('message', function onready(ev: MessageEvent) {
          if (ev.origin !== origin) {
            return
          }
          if (ev.data?.type === 'wanix:ready') {
            clearTimeout(timer)
            window.removeEventListener('message', onready)
            resolve()
          }
        })
      })
    })

    const result = await page.evaluate(async (wasmbytes) => {
      const origin = location.origin
      const wasmbuffer = new Uint8Array(wasmbytes).buffer

      const rpc = (type: string, data: Record<string, unknown>, done: string) =>
        new Promise<{ error?: string }>((resolve) => {
          const id = `e2e-${type}`
          const timer = setTimeout(
            () => resolve({ error: `${type} timeout` }),
            60_000,
          )
          window.addEventListener('message', function onmsg(ev: MessageEvent) {
            if (ev.origin !== origin) {
              return
            }
            if (ev.data?.type === done && ev.data.id === id) {
              clearTimeout(timer)
              window.removeEventListener('message', onmsg)
              resolve({ error: ev.data.error })
            }
          })
          window.postMessage({ type, id, ...data }, origin)
        })

      const putreply = await rpc(
        'wanix:put',
        { name: 'hello.wasm', bytes: wasmbuffer },
        'wanix:put:done',
      )
      if (putreply.error) {
        return { code: -1, error: putreply.error, lines: [] }
      }

      return new Promise<{
        code: number
        error?: string
        lines: string[]
      }>((resolve) => {
        const lines: string[] = []
        const id = 'e2e-host-run'
        const timer = setTimeout(
          () => resolve({ code: -1, error: 'run timeout', lines }),
          60_000,
        )
        window.addEventListener('message', function onmsg(ev: MessageEvent) {
          if (ev.origin !== origin) {
            return
          }
          if (ev.data?.type === 'wanix:log' && ev.data.line) {
            lines.push(String(ev.data.line))
          }
          if (ev.data?.type === 'wanix:run:done' && ev.data.id === id) {
            clearTimeout(timer)
            window.removeEventListener('message', onmsg)
            resolve({
              code: typeof ev.data.code === 'number' ? ev.data.code : 1,
              error: ev.data.error,
              lines,
            })
          }
        })
        window.postMessage(
          { type: 'wanix:run', id, cmd: 'hello.wasm' },
          origin,
        )
      })
    }, HELLO_WASM_BYTE_LIST)

    expect(result.error, JSON.stringify(result, null, 2)).toBeUndefined()
    expect(result.code).toBe(0)
    expect(result.lines.join('\n')).toContain('Hello from wanix!')
  })

  test('runs echo_stdin.wasm and accepts stdin via postMessage', async ({
    page,
  }) => {
    await page.goto('/wanix/host.html')

    await page.waitForFunction(
      () => document.querySelector('wanix-system') != null,
      undefined,
      { timeout: 120_000 },
    )

    await page.evaluate(async () => {
      const origin = location.origin
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('wanix:ready timeout')),
          120_000,
        )
        window.addEventListener('message', function onready(ev: MessageEvent) {
          if (ev.origin !== origin) {
            return
          }
          if (ev.data?.type === 'wanix:ready') {
            clearTimeout(timer)
            window.removeEventListener('message', onready)
            resolve()
          }
        })
      })
    })

    const result = await page.evaluate(async (wasmbytes) => {
      const origin = location.origin
      const wasmbuffer = new Uint8Array(wasmbytes).buffer

      const rpc = (type: string, data: Record<string, unknown>, done: string) =>
        new Promise<{ error?: string }>((resolve) => {
          const id = `e2e-${type}`
          const timer = setTimeout(
            () => resolve({ error: `${type} timeout` }),
            60_000,
          )
          window.addEventListener('message', function onmsg(ev: MessageEvent) {
            if (ev.origin !== origin) {
              return
            }
            if (ev.data?.type === done && ev.data.id === id) {
              clearTimeout(timer)
              window.removeEventListener('message', onmsg)
              resolve({ error: ev.data.error })
            }
          })
          window.postMessage({ type, id, ...data }, origin)
        })

      const putreply = await rpc(
        'wanix:put',
        { name: 'echo_stdin.wasm', bytes: wasmbuffer },
        'wanix:put:done',
      )
      if (putreply.error) {
        return { code: -1, error: putreply.error, lines: [] }
      }

      const lines: string[] = []
      const runid = 'e2e-echo-run'
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
            clearTimeout(timer)
            window.removeEventListener('message', onmsg)
            resolve({
              code: typeof ev.data.code === 'number' ? ev.data.code : 1,
              error: ev.data.error,
            })
          }
        })
        window.postMessage(
          { type: 'wanix:run', id: runid, cmd: 'echo_stdin.wasm' },
          origin,
        )
      })

      await new Promise((resolve) => setTimeout(resolve, 500))
      const stdinreply = await rpc(
        'wanix:stdin',
        { data: 'hello' },
        'wanix:stdin:done',
      )
      if (stdinreply.error) {
        return { code: -1, error: stdinreply.error, lines }
      }

      const runresult = await runpromise
      return { ...runresult, lines }
    }, ECHO_STDIN_WASM_BYTE_LIST)

    expect(result.error, JSON.stringify(result, null, 2)).toBeUndefined()
    expect(result.code).toBe(0)
    expect(result.lines.join('\n')).toContain('echo: hello')
  })
})
