import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

import {
  boardcodedelements,
  layoutfromkind,
  resolvestatcode,
} from 'ops/lib/content/zztcorpus'
import {
  collectzztcorpussourcefiles,
  compilezztoop,
} from 'ops/lib/content/zztcorpuswalk'
import {
  ZZT_CORPUS_EXTRACTED_DIR,
  ZZT_CORPUS_ZSS_DIR,
} from 'ops/lib/fixturepaths'
import { readlimit } from 'tasks/lib/cliargv'
import { runjest } from 'tasks/shellutil'
import { zztparseboard, zztparseworld } from 'zss/feature/parse/zztbinparse'
import type { ZZT_BOARD } from 'zss/feature/parse/zztformattypes'
import { def, handler, jestexec } from '../helpers'
import type { TaskContext, TaskDef } from '../types'

type BookPage = { code?: string }
type BookData = { data?: { pages?: BookPage[] } }

function fixtureid(code: string, index: number) {
  const head = code.split('\n')[0] ?? ''
  const statmatch = /^@\w+\s+(\w+)/.exec(head) ?? /^@(\w+)/.exec(head)
  const raw = statmatch?.[1] ?? `page${index}`
  return (
    raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || `page${index}`
  )
}

function collectcodes(book: BookData) {
  const entries: { id: string; code: string }[] = []
  const seen = new Set<string>()
  const usedids = new Set<string>()
  const pages = book.data?.pages ?? []
  for (let i = 0; i < pages.length; ++i) {
    const code = pages[i]?.code?.trim()
    if (!code || seen.has(code)) {
      continue
    }
    seen.add(code)
    let id = fixtureid(code, i)
    let suffix = 1
    while (usedids.has(id)) {
      id = `${fixtureid(code, i)}_${suffix++}`
    }
    usedids.add(id)
    entries.push({ id, code })
  }
  return entries
}

function runlangbookoracleextract(ctx: TaskContext): number {
  const bookpath =
    ctx.args[0] ??
    path.join(ctx.root, 'ops/fixtures/books/example-coolregionsbow.book.json')
  const outdir = ctx.args[1]
  if (!bookpath || !outdir) {
    console.error('usage: book.json outdir')
    return 1
  }
  const book = JSON.parse(readFileSync(bookpath, 'utf8')) as BookData
  const entries = collectcodes(book)
  mkdirSync(outdir, { recursive: true })
  const manifest: string[] = []
  for (const entry of entries) {
    writeFileSync(
      path.join(outdir, `${entry.id}.zss`),
      `${entry.code}\n`,
      'utf8',
    )
    manifest.push(entry.id)
  }
  manifest.sort()
  writeFileSync(
    path.join(outdir, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  console.log(`wrote ${manifest.length} fixtures to ${outdir}`)
  return 0
}

function runlangregression(ctx: TaskContext): number {
  console.log('▶ typescript-compiler')
  const status = runjest(
    ctx,
    'ops/tests/unit/feature/lang/backend/typescript/',
    ['--no-coverage'],
  )
  if (status === 0) {
    console.log('✓ lang regression complete')
  }
  return status
}

type TriageTag = 'fixable' | 'invalid_zzt' | 'ambiguous'

type AnalyzeOptions = {
  root: string
  limit?: number
  full: boolean
  writefixtures: boolean
  writereport: boolean
  rawonly: boolean
}

type TriageCounts = {
  fixable_fail: number
  invalid_zzt_fail: number
  ambiguous_fail: number
}

function emptytriage(): TriageCounts {
  return { fixable_fail: 0, invalid_zzt_fail: 0, ambiguous_fail: 0 }
}

function tallytriage(triage: TriageCounts, tag: TriageTag) {
  if (tag === 'fixable') {
    triage.fixable_fail += 1
  } else if (tag === 'invalid_zzt') {
    triage.invalid_zzt_fail += 1
  } else {
    triage.ambiguous_fail += 1
  }
}
type FailureBucket = {
  signature: string
  triage: TriageTag
  count: number
  sample_ids: string[]
  sample_error: string
}

type FailureReport = {
  generated_at: string
  corpus_present: boolean
  raw_oop: {
    total: number
    ok: number
    fail: number
    ok_rate: number
  }
  wrapped_zss: {
    total: number
    ok: number
    fail: number
    ok_rate: number
  }
  triage: {
    raw: {
      fixable_fail: number
      invalid_zzt_fail: number
      ambiguous_fail: number
    }
    wrapped: {
      fixable_fail: number
      invalid_zzt_fail: number
      ambiguous_fail: number
    }
  }
  buckets: FailureBucket[]
}

const REPORT_PATH = path.join(
  'ops',
  'fixtures',
  'lang',
  'zztoop',
  'failure-report.json',
)
const FIXTURE_OUT = path.join('ops', 'fixtures', 'lang', 'zztoop', 'corpus')

function parseoptions(argv: string[]): AnalyzeOptions {
  const root = process.cwd()
  let full = false
  let writefixtures = false
  let writereport = true
  let rawonly = false

  for (let i = 0; i < argv.length; ++i) {
    const arg = argv[i]
    if (arg === 'raw-only' || arg === '--raw-only') {
      rawonly = true
      continue
    }
    if (arg === 'full' || arg === '--full') {
      full = true
      continue
    }
    if (arg === 'write-fixtures' || arg === '--write-fixtures') {
      writefixtures = true
      continue
    }
    if (arg === 'write-report' || arg === '--write-report') {
      writereport = true
      continue
    }
  }

  return {
    root,
    limit: readlimit(argv),
    full,
    writefixtures,
    writereport,
    rawonly,
  }
}

function normalizeerror(message: string): string {
  return message
    .replace(/\d+/g, 'N')
    .replace(/offset \d+/gi, 'offset N')
    .slice(0, 240)
}

function triagecode(code: string, error?: string): TriageTag {
  if (!code.trim()) {
    return 'invalid_zzt'
  }
  if (code.includes('\x00')) {
    return 'invalid_zzt'
  }
  if (code.trim().length < 2 && !/[:#@/?]/.test(code)) {
    return 'invalid_zzt'
  }
  if (error && /unexpected character|Redundant input/i.test(error)) {
    return 'ambiguous'
  }
  return 'fixable'
}

function compilecheck(source: string) {
  const { ok, error } = compilezztoop(source)
  return { ok, error }
}

function elementid(
  sourcepath: string,
  boardindex: number,
  statindex: number,
  kind: string,
): string {
  const rel = path.relative(ZZT_CORPUS_EXTRACTED_DIR, sourcepath)
  const parts = rel.split(path.sep)
  const zipstem = parts[1] ?? 'unknown'
  const sourcestem = path.basename(sourcepath, path.extname(sourcepath))
  return `${zipstem}__${sourcestem}__b${boardindex}__s${statindex}__${kind}`
}

function processsource(
  sourcepath: string,
  buckets: Map<string, FailureBucket>,
  stats: FailureReport['raw_oop'],
  triage: TriageCounts,
) {
  const bytes = readFileSync(sourcepath)
  const content = new Uint8Array(bytes)
  const lower = sourcepath.toLowerCase()
  const layoutkind = lower.endsWith('.brd') ? 'zzt' : 'zzt'

  const emitboard = (
    boardindex: number,
    board: ZZT_BOARD,
    layoutkind2: 'zzt' | 'szzt',
  ) => {
    const layout = layoutfromkind(layoutkind2)
    const elements = boardcodedelements(board, layout, boardindex)
    for (let e = 0; e < elements.length; ++e) {
      const element = elements[e]
      const code = resolvestatcode(element.stat, board.stats)
      if (!code) {
        continue
      }
      stats.total += 1
      const id = elementid(
        sourcepath,
        element.boardindex,
        element.statindex,
        element.kind,
      )
      const { ok, error } = compilecheck(code)
      if (ok) {
        stats.ok += 1
        continue
      }
      stats.fail += 1
      const tag = triagecode(code, error)
      tallytriage(triage, tag)
      const signature = normalizeerror(error ?? 'unknown')
      let bucket = buckets.get(signature)
      if (!bucket) {
        bucket = {
          signature,
          triage: tag,
          count: 0,
          sample_ids: [],
          sample_error: error ?? '',
        }
        buckets.set(signature, bucket)
      }
      bucket.count += 1
      if (bucket.sample_ids.length < 3) {
        bucket.sample_ids.push(id)
      }
    }
  }

  if (lower.endsWith('.brd')) {
    const board = zztparseboard(content, layoutfromkind('zzt'))
    if (board) {
      emitboard(0, board, 'zzt')
    }
    return
  }

  const world = zztparseworld(content)
  if (!world.ok) {
    return
  }
  const layout = layoutfromkind('zzt')
  for (let bi = 0; bi < world.boards.length; ++bi) {
    const board = world.boards[bi]
    if (board) {
      emitboard(bi, board, layout.kind)
    }
  }
}

function analyzewrapped(
  buckets: Map<string, FailureBucket>,
  stats: FailureReport['wrapped_zss'],
  triage: TriageCounts,
  limit?: number,
) {
  const zssroot = ZZT_CORPUS_ZSS_DIR
  if (!existsSync(zssroot)) {
    return
  }

  const files: string[] = []
  function walk(dir: string) {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (let i = 0; i < entries.length; ++i) {
      const entry = entries[i]
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.name.endsWith('.zss')) {
        files.push(full)
      }
    }
  }
  walk(zssroot)

  const slice = typeof limit === 'number' ? files.slice(0, limit) : files
  for (let i = 0; i < slice.length; ++i) {
    const file = slice[i]
    const source = readFileSync(file, 'utf8')
    stats.total += 1
    const { ok, error } = compilecheck(source)
    if (ok) {
      stats.ok += 1
      continue
    }
    stats.fail += 1
    const tag = triagecode(source, error)
    tallytriage(triage, tag)
    const signature = `wrapped:${normalizeerror(error ?? 'unknown')}`
    let bucket = buckets.get(signature)
    if (!bucket) {
      bucket = {
        signature,
        triage: tag,
        count: 0,
        sample_ids: [path.relative(zssroot, file)],
        sample_error: error ?? '',
      }
      buckets.set(signature, bucket)
    }
    bucket.count += 1
    if (bucket.sample_ids.length < 3) {
      const rel = path.relative(zssroot, file)
      if (!bucket.sample_ids.includes(rel)) {
        bucket.sample_ids.push(rel)
      }
    }
  }
}

function writerankfixtures(buckets: FailureBucket[], extractedroot: string) {
  const outdir = path.join(process.cwd(), FIXTURE_OUT)
  mkdirSync(outdir, { recursive: true })
  const top = buckets
    .filter((b) => b.triage === 'fixable')
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  for (let i = 0; i < top.length; ++i) {
    const bucket = top[i]
    const id = bucket.sample_ids[0]
    if (!id) {
      continue
    }
    const parts = id.split('__')
    if (parts.length < 4) {
      continue
    }
    const zipstem = parts[0]
    const sourcestem = parts[1]
    const boardindex = Number.parseInt(parts[2]?.replace(/^b/, '') ?? '0', 10)
    const statindex = Number.parseInt(parts[3]?.replace(/^s/, '') ?? '0', 10)
    const letter = zipstem[0]?.toLowerCase() ?? 'z'
    const guess = path.join(extractedroot, letter, zipstem, `${sourcestem}.ZZT`)
    if (!existsSync(guess)) {
      const brd = guess.replace(/\.ZZT$/i, '.BRD')
      if (!existsSync(brd)) {
        continue
      }
    }
    const sourcepath = existsSync(guess)
      ? guess
      : guess.replace(/\.ZZT$/i, '.BRD')
    const bytes = readFileSync(sourcepath)
    const content = new Uint8Array(bytes)
    const lower = sourcepath.toLowerCase()
    let board: ZZT_BOARD | undefined
    let layoutkind: 'zzt' | 'szzt' = 'zzt'
    if (lower.endsWith('.brd')) {
      board = zztparseboard(content, layoutfromkind('zzt'))
      layoutkind = 'zzt'
    } else {
      const world = zztparseworld(content)
      if (!world.ok || !world.boards[boardindex]) {
        continue
      }
      board = world.boards[boardindex]!
      layoutkind = layoutfromkind('zzt').kind
    }
    if (!board) {
      continue
    }
    const layout = layoutfromkind(layoutkind)
    const elements = boardcodedelements(board, layout, boardindex)
    const element = elements.find((el) => el.statindex === statindex)
    if (!element) {
      continue
    }
    const code = resolvestatcode(element.stat, board.stats)
    if (!code) {
      continue
    }
    const outpath = path.join(outdir, `bucket_${i}.zss`)
    writeFileSync(outpath, `// source: ${id}\n// ${bucket.signature}\n${code}`)
  }
}

export async function analyzezztoopcorpus(argv: string[]): Promise<number> {
  const opts = parseoptions(argv)
  const extractedroot = ZZT_CORPUS_EXTRACTED_DIR
  const corpuspresent = existsSync(extractedroot)

  if (!corpuspresent) {
    console.warn(
      `zzt corpus extracted/ not found at ${extractedroot} — writing empty report`,
    )
  }

  const buckets = new Map<string, FailureBucket>()
  const rawstats = { total: 0, ok: 0, fail: 0, ok_rate: 0 }
  const wrappedstats = { total: 0, ok: 0, fail: 0, ok_rate: 0 }
  const rawtriage = emptytriage()
  const wrappedtriage = emptytriage()
  const sampleonly = typeof opts.limit === 'number' && !opts.full

  if (corpuspresent) {
    const sources = collectzztcorpussourcefiles(extractedroot)
    const slice = sampleonly ? sources.slice(0, opts.limit) : sources
    for (let i = 0; i < slice.length; ++i) {
      try {
        processsource(slice[i], buckets, rawstats, rawtriage)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`\nanalyze skip ${slice[i]}: ${message}`)
      }
      if ((i + 1) % 500 === 0) {
        process.stdout.write(`\rraw_oop: ${i + 1}/${slice.length}`)
      }
    }
    process.stdout.write('\n')

    if (existsSync(ZZT_CORPUS_ZSS_DIR) && !opts.rawonly) {
      analyzewrapped(
        buckets,
        wrappedstats,
        wrappedtriage,
        sampleonly ? opts.limit : undefined,
      )
    }
  }

  rawstats.ok_rate = rawstats.total > 0 ? rawstats.ok / rawstats.total : 1
  wrappedstats.ok_rate =
    wrappedstats.total > 0 ? wrappedstats.ok / wrappedstats.total : 1

  const report: FailureReport = {
    generated_at: new Date().toISOString(),
    corpus_present: corpuspresent,
    raw_oop: rawstats,
    wrapped_zss: wrappedstats,
    triage: { raw: rawtriage, wrapped: wrappedtriage },
    buckets: [...buckets.values()].sort((a, b) => b.count - a.count),
  }

  const reportpath = path.join(process.cwd(), REPORT_PATH)
  if (opts.writereport && !sampleonly) {
    mkdirSync(path.dirname(reportpath), { recursive: true })
    writeFileSync(reportpath, `${JSON.stringify(report, null, 2)}\n`)
  }

  if (opts.writefixtures && corpuspresent) {
    writerankfixtures(report.buckets, extractedroot)
  }

  console.log(
    `report: ${opts.writereport && !sampleonly ? reportpath : '(not written — use full run for committed report)'} raw_oop=${rawstats.ok}/${rawstats.total} (${(rawstats.ok_rate * 100).toFixed(2)}%) raw_fixable=${rawtriage.fixable_fail} raw_invalid=${rawtriage.invalid_zzt_fail}`,
  )

  return rawstats.ok_rate >= 0.99 ? 0 : 1
}

export const LANG_TASKS: TaskDef[] = [
  def('lang:book:oracle:extract', {
    description: 'Extract book JSON into lang integration oracle files',
    run: handler(runlangbookoracleextract),
  }),
  def('lang:regression:test', {
    description: 'TypeScript lang parser regression tests',
    tags: ['ci'],
    run: handler(runlangregression),
  }),
  def('lang:zztoop:corpus:analyze', {
    description:
      'Analyze Museum ZZT corpus with the vanilla zss/feature/zztoop parser; write ops/fixtures/lang/zztoop/failure-report.json. Flags: raw-only, write-fixtures, limit N, full',
    tags: ['slow'],
    run: handler((ctx) => analyzezztoopcorpus(ctx.args)),
  }),
  def('lang:build-train-corpus', {
    description: 'Jest build training corpus fixture',
    run: jestexec('ops/tests/unit/feature/heavy/training/buildcorpus.test.ts', [
      '--no-coverage',
    ]),
  }),
  def('lang:train-corpus:test', {
    description: 'Jest train corpus tests',
    run: jestexec('ops/tests/unit/feature/heavy/training/traincorpus.test.ts', [
      '--no-coverage',
    ]),
  }),
]
