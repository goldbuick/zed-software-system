/**
 * Shared Playwright + parity Vite helpers for offline render scripts.
 */
import type { Browser, Page } from '@playwright/test'
import { chromium } from '@playwright/test'

import { PLAYWRIGHT_SCENARIO_TIMEOUT_MS } from './parity-timeouts.ts'
import {
  PARITY_SERVER_PORT,
  startparityvite,
  stopparityvite,
} from './parity-vite-server.ts'

export const DEFAULT_PARITY_PORT = PARITY_SERVER_PORT
export const PARITY_HOST_PATH = '/offline-render-host.html'

export function parityhosturl(port = DEFAULT_PARITY_PORT): string {
  return `http://127.0.0.1:${port}${PARITY_HOST_PATH}`
}

export async function startparityvitehost(
  projectroot: string,
  port = DEFAULT_PARITY_PORT,
) {
  return startparityvite(projectroot, port)
}

export async function launchparitybrowser(timeoutms = 60_000): Promise<Browser> {
  return chromium.launch({ timeout: timeoutms })
}

export async function openparitypage(
  browser: Browser,
  hosturl: string,
): Promise<Page> {
  const page = await browser.newPage()
  page.setDefaultTimeout(PLAYWRIGHT_SCENARIO_TIMEOUT_MS)
  await page.goto(hosturl, {
    waitUntil: 'domcontentloaded',
    timeout: PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
  })
  return page
}

export async function runpageevaluate<T, A>(
  page: Page,
  fn: (arg: A) => Promise<T>,
  arg: A,
): Promise<T> {
  return page.evaluate(fn, arg)
}

export { stopparityvite }
