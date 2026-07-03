import {
  PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
  withscripttimeout,
} from 'tasks/lib/parity/parity-timeouts'

export async function waitforregistersession(
  page: import('@playwright/test').Page,
  root: string,
  label = 'register-session',
  timeoutms = PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
): Promise<void> {
  await withscripttimeout(label, timeoutms, async () => {
    while (true) {
      const ready = await page.evaluate(async (projectroot) => {
        const { register } = await import(
          `/@fs${projectroot}/zss/device/register.ts`
        )
        return register.session().length > 0
      }, root)
      if (ready) {
        break
      }
      await page.waitForTimeout(250)
    }
  })
}
