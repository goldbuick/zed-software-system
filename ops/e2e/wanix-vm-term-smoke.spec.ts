import { expect, test } from '@playwright/test'

import {
  attachwanixpaniccollector,
  WANIX_GOJS_PANIC_RE,
} from './helpers/wanixpanic'

test.describe('wanix basic-vm wanix-term smoke', () => {
  test.describe.configure({ timeout: 600_000 })

  test('vm-simple.html login and id via probe harness', async ({ page }) => {
    const collector = attachwanixpaniccollector(page)
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/wanix/vm-simple.html?probe=1')
    await page.waitForFunction(
      () =>
        (window as Window & { __WANIX_TERM_PROBE__?: { waitprompt: (ms?: number) => Promise<void> } })
          .__WANIX_TERM_PROBE__ != null,
      { timeout: 120_000 },
    )

    await page.evaluate(async () => {
      const probe = (
        window as Window & {
          __WANIX_TERM_PROBE__?: {
            waitprompt: (ms?: number) => Promise<void>
            sendinput: (text: string) => void
            readserial: () => string
          }
        }
      ).__WANIX_TERM_PROBE__!
      await probe.waitprompt(600_000)
      probe.sendinput('root')
      probe.sendinput('\r')
      probe.sendinput('\r')
      probe.sendinput('id')
      probe.sendinput('\r')
      const deadline = Date.now() + 120_000
      while (Date.now() < deadline) {
        if (/uid=/.test(probe.readserial())) {
          return
        }
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
      throw new Error(`uid= not found in serial:\n${probe.readserial().slice(-800)}`)
    })

    const panics = [
      ...collector.filterpanics(),
      ...errors.filter((line) => WANIX_GOJS_PANIC_RE.test(line)),
    ]
    expect(panics, panics.join('\n')).toEqual([])
    collector.detach()
  })
})
