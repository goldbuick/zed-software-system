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
  ZZT_CORPUS_EXTRACTED_DIR,
  ZZT_CORPUS_ZSS_DIR,
} from 'ops/lib/fixturepaths'
import { compileparse } from 'zss/feature/lang/backend/typescript/compileparse'
import { zztparseboard, zztparseworld } from 'zss/feature/parse/zztbinparse'
import type { ZZT_BOARD } from 'zss/feature/parse/zztformattypes'

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
  'zzt',
  'failure-report.json',
)
const FIXTURE_OUT = path.join('ops', 'fixtures', 'lang', 'zzt', 'corpus')

function parseoptions(argv: string[]): AnalyzeOptions {
  const root = process.cwd()
  let limit: number | undefined
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
    if (arg === 'limit' || arg === '--limit') {
      const next = argv[i + 1]
      if (next) {
        limit = Number.parseInt(next, 10)
        ++i
      }
    }
  }

  return { root, limit, full, writefixtures, writereport, rawonly }
}

function iszztorbrd(name: string): boolean {
  const lower = name.toLowerCase()
  return lower.endsWith('.zzt') || lower.endsWith('.brd')
}

function collectsourcefiles(dir: string): string[] {
  const out: string[] = []
  function walk(current: string) {
    if (!existsSync(current)) {
      return
    }
    const entries = readdirSync(current, { withFileTypes: true })
    for (let i = 0; i < entries.length; ++i) {
      const entry = entries[i]
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (iszztorbrd(entry.name)) {
        out.push(full)
      }
    }
  }
  walk(dir)
  return out
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
  const result = compileparse(source)
  const ok = !(result.errors && result.errors.length > 0) && !!result.cst
  const error = result.errors?.[0]?.message
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

export async function analyzezztcorpus(argv: string[]): Promise<number> {
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
    const sources = collectsourcefiles(extractedroot)
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

async function main() {
  const code = await analyzezztcorpus(process.argv.slice(2))
  process.exit(code)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
