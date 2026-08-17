import path from 'node:path'
import { pathToFileURL } from 'node:url'

import type { Browser, Page } from '@playwright/test'
import { launchparitybrowser } from 'tasks/lib/parity/parity-playwright'
import {
  PARITY_RENDER_SCRIPT_TIMEOUT_MS,
  withscripttimeout,
} from 'tasks/lib/parity/parity-timeouts'

export type HeadedPlaywrightContext = {
  browser: Browser
  page: Page
  baseurl: string
  root: string
}

export type HeadedPlaywrightScript = (
  ctx: HeadedPlaywrightContext,
) => Promise<void>

function readtaskextraargs(taskid: string, extraargs: string[]): string[] {
  if (extraargs.length > 0) {
    return extraargs
  }
  const idx = process.argv.lastIndexOf(taskid)
  if (idx < 0) {
    return []
  }
  return process.argv.slice(idx + 1).filter((arg) => arg !== '--')
}

function readurlflag(argv: string[]): string {
  for (let i = 0; i < argv.length; ++i) {
    if (argv[i] === '--url') {
      const next = argv[i + 1]
      if (!next) {
        throw new Error('--url requires a value')
      }
      return next
    }
  }
  if (argv[0]?.includes('://')) {
    return argv[0]
  }
  throw new Error(
    '--url is required (or pass base URL as first positional arg)',
  )
}

function readscriptpath(argv: string[], root: string): string {
  const positional: string[] = []
  for (let i = 0; i < argv.length; ++i) {
    const arg = argv[i]
    if (arg === '--url') {
      ++i
      continue
    }
    if (arg.startsWith('-')) {
      throw new Error(`unknown flag: ${arg}`)
    }
    positional.push(arg)
  }
  const scriptarg =
    positional.length > 1 && positional[0]?.includes('://')
      ? positional[1]
      : positional[0]
  if (!scriptarg) {
    throw new Error('script path is required')
  }
  return path.resolve(root, scriptarg)
}

export async function runheadedplaywrightscript(
  root: string,
  taskid: string,
  extraargs: string[],
): Promise<number> {
  const argv = readtaskextraargs(taskid, extraargs)
  const baseurl = readurlflag(argv)
  const scriptpath = readscriptpath(argv, root)
  const mod = (await import(pathToFileURL(scriptpath).href)) as {
    default?: HeadedPlaywrightScript
  }
  const script = mod.default
  if (typeof script !== 'function') {
    throw new Error(`${scriptpath} must default-export an async function`)
  }

  const scripttimeoutms = scriptpath.includes('tvsink-headed')
    ? 1_200_000
    : PARITY_RENDER_SCRIPT_TIMEOUT_MS

  const browser = await launchparitybrowser()
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true })
    const page = await context.newPage()
    page.setDefaultTimeout(PARITY_RENDER_SCRIPT_TIMEOUT_MS)
    await withscripttimeout('headed-playwright-script', scripttimeoutms, () =>
      script({ browser, page, baseurl, root }),
    )
    return 0
  } finally {
    await browser.close()
  }
}
