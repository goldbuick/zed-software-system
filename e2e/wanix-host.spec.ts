import { expect, test } from '@playwright/test'

test.describe('wanix host page (isolated)', () => {
  test.describe.configure({ timeout: 180_000 })

  test('vends hello.wasm and runtime assets', async ({ request }) => {
    for (const path of [
      '/wanix/host.html',
      '/wanix/hello.wasm',
      '/wanix/wanix.wasm',
      '/wanix/wanix.min.js',
      '/wanix/wasi-minimal.bundle.tgz',
    ]) {
      const res = await request.get(path)
      expect(res.ok(), `${path} should be served`).toBeTruthy()
    }
  })

  test('boots wanix-system and runs hello.wasm via postMessage', async ({
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

    const result = await page.evaluate(async () => {
      const origin = location.origin
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
        window.postMessage({ type: 'wanix:run', id, cmd: 'hello.wasm' }, origin)
      })
    })

    expect(result.error, JSON.stringify(result, null, 2)).toBeUndefined()
    expect(result.code).toBe(0)
    expect(result.lines.join('\n')).toContain('Hello from wanix!')
  })
})
