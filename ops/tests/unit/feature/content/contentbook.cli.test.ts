import { readFileSync } from 'node:fs'
import path from 'node:path'

import {
  buildbookfrommanifest,
  unwrapbookjson,
  validatebookexport,
  validatecodepagefile,
  writebookexport,
} from 'zss/feature/content/contentbook'
import type { CONTENT_BOOK_EXPORT } from 'zss/feature/content/contentbook'
import { CONTENT_DIST_DIR } from 'ops/lib/fixturepaths'
const task = process.env.CONTENT_CLI_TASK ?? ''

function cliarg(): string {
  const arg = process.env.CONTENT_CLI_ARG ?? ''
  if (!arg) {
    throw new Error('CONTENT_CLI_ARG not set')
  }
  return path.isAbsolute(arg) ? arg : path.join(process.cwd(), arg)
}

function cliextra(): string[] {
  const raw = process.env.CONTENT_CLI_EXTRA ?? '[]'
  return JSON.parse(raw) as string[]
}

function resolvemanifest(manifestarg: string) {
  if (manifestarg.endsWith('manifest.json')) {
    return { manifestpath: manifestarg, rootdir: path.dirname(manifestarg) }
  }
  const manifestpath = path.join(manifestarg, 'manifest.json')
  return { manifestpath, rootdir: manifestarg }
}

function parseoutflag(extra: string[]) {
  const idx = extra.indexOf('--out')
  if (idx >= 0) {
    return extra[idx + 1] ?? ''
  }
  return ''
}

if (!task) {
  it.skip('content cli env not set', () => {})
} else if (task === 'build') {
  it('content cli build', () => {
    const manifestarg = cliarg()
    const extra = cliextra()
    const { manifestpath, rootdir } = resolvemanifest(manifestarg)
    const exportbook = buildbookfrommanifest(manifestpath, rootdir)
    const outflag = parseoutflag(extra)
    const bookout = outflag || path.join(CONTENT_DIST_DIR, exportbook.exported)
    writebookexport(exportbook, bookout)
    process.stdout.write(`wrote ${bookout}\n`)
  })
} else if (task === 'validate') {
  it('content cli validate', () => {
    const bookpath = cliarg()
    const raw = JSON.parse(readFileSync(bookpath, 'utf8')) as unknown
    const unwrapped = unwrapbookjson(raw)
    const exportbook: CONTENT_BOOK_EXPORT = {
      exported: unwrapped.exported ?? path.basename(bookpath),
      data: unwrapped.data,
    }
    const errors = validatebookexport(exportbook)
    if (errors.length) {
      throw new Error(errors.join('\n'))
    }
    process.stdout.write(`ok ${bookpath}\n`)
  })
} else if (task === 'codepage-validate') {
  it('content cli codepage validate', () => {
    const pagepath = cliarg()
    const errors = validatecodepagefile(pagepath)
    if (errors.length) {
      throw new Error(errors.join('\n'))
    }
    process.stdout.write(`ok ${pagepath}\n`)
  })
} else {
  it('content cli unknown task', () => {
    throw new Error(`unknown CONTENT_CLI_TASK: ${task}`)
  })
}
