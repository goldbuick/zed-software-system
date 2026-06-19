/** Playwright helpers — catch gojs / syscall/js panics during wanix VM e2e. */
import type { BrowserContext, Page } from '@playwright/test'

/** Matches the console signatures from a dead gojs worker. */
export const WANIX_GOJS_PANIC_RE =
  /panic|unreachable|Value\.Set on undefined|Offset is outside the bounds of the DataView/i

export type WanixPanicCollector = {
  panics: string[]
  filterpanics: () => string[]
  detach: () => void
}

export function attachwanixpaniccollector(page: Page): WanixPanicCollector {
  const panics: string[] = []
  const attachedpages = new Set<Page>()
  const context: BrowserContext = page.context()

  const onpageerror = (target: Page) => (err: Error) => {
    if (WANIX_GOJS_PANIC_RE.test(err.message)) {
      panics.push(err.message)
    }
  }
  const onconsole = (target: Page) => (msg: { type: () => string; text: () => string }) => {
    const text = msg.text()
    if (msg.type() === 'error' && WANIX_GOJS_PANIC_RE.test(text)) {
      panics.push(text)
    }
  }

  const pagehandlers = new Map<
    Page,
    { pageerror: (err: Error) => void; console: ReturnType<typeof onconsole> }
  >()

  function attachpage(target: Page) {
    if (attachedpages.has(target)) {
      return
    }
    attachedpages.add(target)
    const pageerror = onpageerror(target)
    const consolehandler = onconsole(target)
    pagehandlers.set(target, { pageerror, console: consolehandler })
    target.on('pageerror', pageerror)
    target.on('console', consolehandler)
  }

  function detachpage(target: Page) {
    const handlers = pagehandlers.get(target)
    if (!handlers) {
      return
    }
    target.off('pageerror', handlers.pageerror)
    target.off('console', handlers.console)
    pagehandlers.delete(target)
    attachedpages.delete(target)
  }

  const onnewpage = (target: Page) => {
    attachpage(target)
  }

  attachpage(page)
  context.on('page', onnewpage)

  return {
    panics,
    filterpanics: () => [...panics],
    detach: () => {
      context.off('page', onnewpage)
      for (const target of [...attachedpages]) {
        detachpage(target)
      }
    },
  }
}
