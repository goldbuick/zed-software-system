/** Helpers for wanix host iframe e2e (term bridge + binds). */
export const TERM_BLOCK_MS = 800

export type WanixHostRunResult = {
  code: number
  error?: string
  output: string
  termwritesucceeded?: boolean
}

export async function waitforwanixhostready(page: {
  evaluate: (fn: () => Promise<void>) => Promise<void>
  waitForFunction: (
    fn: () => boolean,
    arg: undefined,
    opts: { timeout: number },
  ) => Promise<void>
  goto: (url: string) => Promise<unknown>
}): Promise<void> {
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
}
