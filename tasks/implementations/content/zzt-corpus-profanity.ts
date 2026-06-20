import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

import {
  corpusmatchpattern,
  corpusscanline,
  sanitizesource,
} from 'zss/feature/content/zztcorpussanitize'
import { ZZT_CORPUS_ZSS_DIR } from 'zss/testsupport/fixturepaths'

const REPORT_DIR = path.join('ops', 'fixtures', 'zzt', 'corpus')
const SCAN_REPORT_PATH = path.join(REPORT_DIR, 'profanity-report.json')
const SANITIZE_REPORT_PATH = path.join(REPORT_DIR, 'sanitize-report.json')

type ScanHit = ReturnType<typeof corpusscanline>[number]

type TaskOptions = {
  dryrun: boolean
  limit?: number
  verify: boolean
}

function parseoptions(argv: string[]): TaskOptions {
  let dryrun = false
  let verify = false
  let limit: number | undefined

  for (let i = 0; i < argv.length; ++i) {
    const arg = argv[i]
    if (arg === 'dry-run' || arg === '--dry-run') {
      dryrun = true
      continue
    }
    if (arg === 'verify' || arg === '--verify') {
      verify = true
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

  return { dryrun, limit, verify }
}

function collectzztfiles(root: string): string[] {
  const out: string[] = []
  function walk(dir: string) {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (let i = 0; i < entries.length; ++i) {
      const entry = entries[i]
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.name.endsWith('.zss')) {
        out.push(full)
      }
    }
  }
  walk(root)
  return out
}

function scancorpus(): ScanHit[] {
  const pattern = corpusmatchpattern()
  const result = spawnSync(
    'rg',
    [
      '-i',
      '-w',
      '--no-heading',
      '-n',
      pattern,
      ZZT_CORPUS_ZSS_DIR,
      '--glob',
      '*.zss',
    ],
    { encoding: 'utf8', maxBuffer: 1024 * 1024 * 512 },
  )
  if (result.error) {
    throw result.error
  }

  const hits: ScanHit[] = []
  const rows = (result.stdout ?? '').split('\n').filter(Boolean)
  for (let i = 0; i < rows.length; ++i) {
    const row = rows[i]
    const sep = row.indexOf(':')
    const sep2 = row.indexOf(':', sep + 1)
    if (sep < 0 || sep2 < 0) {
      continue
    }
    const filepath = row.slice(0, sep)
    const linenumber = Number.parseInt(row.slice(sep + 1, sep2), 10)
    const text = row.slice(sep2 + 1)
    const rel = path.relative(ZZT_CORPUS_ZSS_DIR, filepath).replace(/\\/g, '/')
    hits.push(...corpusscanline(rel, linenumber, text))
  }
  return hits
}

function writescanreport(hits: ScanHit[], elapsedms: number) {
  const byterm = new Map<string, number>()
  const byarchive = new Map<string, number>()
  const byfile = new Map<string, number>()
  const bytier = { strong: 0, mild: 0, racial: 0 }

  for (let i = 0; i < hits.length; ++i) {
    const hit = hits[i]
    byterm.set(hit.term, (byterm.get(hit.term) ?? 0) + 1)
    byarchive.set(hit.archive, (byarchive.get(hit.archive) ?? 0) + 1)
    byfile.set(hit.file, (byfile.get(hit.file) ?? 0) + 1)
    bytier[hit.tier] += 1
  }

  const report = {
    generated_at: new Date().toISOString(),
    corpus_dir: ZZT_CORPUS_ZSS_DIR,
    stats: {
      line_hits: hits.length,
      files_with_hits: byfile.size,
      strong_hits: bytier.strong,
      mild_hits: bytier.mild,
      racial_hits: bytier.racial,
      elapsed_ms: elapsedms,
    },
    by_term: Object.fromEntries(
      [...byterm.entries()].sort((a, b) => b[1] - a[1]),
    ),
    by_archive: Object.fromEntries(
      [...byarchive.entries()].sort((a, b) => b[1] - a[1]),
    ),
    hits,
  }

  mkdirSync(REPORT_DIR, { recursive: true })
  writeFileSync(SCAN_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`)
  return report
}

export function scanzztcorpusprofanity(argv: string[]): number {
  const opts = parseoptions(argv)
  const t0 = Date.now()
  let hits = scancorpus()
  if (typeof opts.limit === 'number') {
    hits = hits.slice(0, opts.limit)
  }
  const report = writescanreport(hits, Date.now() - t0)

  console.log(`report: ${SCAN_REPORT_PATH}`)
  console.log(
    `hits=${report.stats.line_hits} files=${report.stats.files_with_hits} strong=${report.stats.strong_hits} mild=${report.stats.mild_hits} racial=${report.stats.racial_hits}`,
  )

  if (opts.verify && report.stats.line_hits > 0) {
    console.error('profanity verify failed — run content:zzt:corpus:sanitize')
    return 1
  }
  return 0
}

export function sanitizezztcorpus(argv: string[]): number {
  const opts = parseoptions(argv)
  const t0 = Date.now()

  if (!existsSync(ZZT_CORPUS_ZSS_DIR)) {
    throw new Error(`missing corpus zss dir at ${ZZT_CORPUS_ZSS_DIR}`)
  }

  const prescan = scancorpus()
  const dirtyfiles = [...new Set(prescan.map((hit) => hit.file))]
  const slice =
    typeof opts.limit === 'number'
      ? dirtyfiles.slice(0, opts.limit)
      : dirtyfiles

  const changes: {
    file: string
    lines_before: number
    lines_after: number
  }[] = []

  for (let i = 0; i < slice.length; ++i) {
    const rel = slice[i]
    const full = path.join(ZZT_CORPUS_ZSS_DIR, rel)
    const before = readFileSync(full, 'utf8')
    const after = sanitizesource(before)
    if (before === after) {
      continue
    }
    changes.push({
      file: rel,
      lines_before: before.split('\n').length,
      lines_after: after.split('\n').length,
    })
    if (!opts.dryrun) {
      writeFileSync(full, after)
    }
    if ((i + 1) % 500 === 0) {
      process.stdout.write(`\rsanitize: ${i + 1}/${slice.length}`)
    }
  }
  process.stdout.write('\n')

  const posthits = opts.dryrun ? prescan : scancorpus()
  const report = {
    generated_at: new Date().toISOString(),
    dry_run: opts.dryrun,
    corpus_dir: ZZT_CORPUS_ZSS_DIR,
    stats: {
      files_scanned: slice.length,
      files_changed: changes.length,
      hits_before: prescan.length,
      hits_after: posthits.length,
      elapsed_ms: Date.now() - t0,
    },
    changes,
  }

  mkdirSync(REPORT_DIR, { recursive: true })
  writeFileSync(SANITIZE_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`)

  console.log(`report: ${SANITIZE_REPORT_PATH}`)
  console.log(
    `changed=${changes.length} hits_before=${prescan.length} hits_after=${posthits.length} dry_run=${opts.dryrun}`,
  )

  if (!opts.dryrun && posthits.length > 0) {
    console.error('sanitize incomplete — remaining hits; extend word list or allowlist')
    return 1
  }
  return 0
}

async function main() {
  const mode = process.argv[2] ?? 'scan'
  const argv = process.argv.slice(3)
  const code =
    mode === 'sanitize'
      ? sanitizezztcorpus(argv)
      : scanzztcorpusprofanity(argv)
  process.exit(code)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
