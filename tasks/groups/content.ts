import { execSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'

import JSZip from 'jszip'
import {
  type ZZT_BOARD_LAYOUT,
  boardcodedelements,
  corpusboardscreenshotid,
  corpusentryid,
  elementtozss,
  layoutfromkind,
  resolvestatcode,
} from 'ops/lib/content/zztcorpus'
import {
  corpusmatchpattern,
  corpusscanline,
  sanitizesource,
} from 'ops/lib/content/zztcorpussanitize'
import {
  collectzztcorpussourcefiles,
  compilezztoop,
  iszztorbrd,
} from 'ops/lib/content/zztcorpuswalk'
import { ZZT_CORPUS_ZSS_DIR } from 'ops/lib/fixturepaths'
import { readforce, readlimit } from 'tasks/lib/cliargv'
import { runjest } from 'tasks/shellutil'
import { zztparseboard, zztparseworld } from 'zss/feature/parse/zztbinparse'
import type { ZZT_BOARD } from 'zss/feature/parse/zztformattypes'

import { def, handler, jestexec } from '../helpers'
import type { TaskContext, TaskDef } from '../types'

const CORPUS_DIR = path.join('ops', 'fixtures', 'zzt', 'corpus')
const ARCHIVES_DIR = path.join(CORPUS_DIR, 'archives')
const EXTRACTED_DIR = path.join(CORPUS_DIR, 'extracted')
const ZSS_DIR = path.join(CORPUS_DIR, 'zss')
const MANIFEST_PATH = path.join(CORPUS_DIR, 'manifest.json')
const ZSS_MANIFEST_PATH = path.join(ZSS_DIR, 'manifest.json')
const SCREENSHOTS_DIR = path.join(CORPUS_DIR, 'screenshots')
const SCREENSHOTS_MANIFEST_PATH = path.join(SCREENSHOTS_DIR, 'manifest.json')
const REPORT_DIR = path.join('ops', 'fixtures', 'zzt', 'corpus')
const SCAN_REPORT_PATH = path.join(REPORT_DIR, 'profanity-report.json')
const SANITIZE_REPORT_PATH = path.join(REPORT_DIR, 'sanitize-report.json')

// --- museum-zzt-filter ---
export type MuseumDetail = {
  id: number
  detail: string
}

export type MuseumFile = {
  letter: string
  filename: string
  title: string
  author: string[]
  genres: string[]
  checksum: string
  archive_name: string
  size: number
  details: MuseumDetail[]
  publish_date?: string
  playable_boards?: number
  total_boards?: number
}

const EXCLUDED_DETAILS = new Set([
  'Weave ZZT World',
  'Super ZZT World',
  'Super ZZT Board',
])

export function isvanillazztworld(entry: MuseumFile): boolean {
  const tags = entry.details.map((detail) => detail.detail)
  if (!tags.includes('ZZT World')) {
    return false
  }
  for (const tag of tags) {
    if (EXCLUDED_DETAILS.has(tag)) {
      return false
    }
  }
  if (entry.archive_name.startsWith('wzzt_')) {
    return false
  }
  if (entry.archive_name.startsWith('szzt_')) {
    return false
  }
  return true
}

export type MuseumFilterStats = {
  catalog_total: number
  included: number
  excluded_weave: number
  excluded_super: number
  excluded_no_zzt_world: number
}

export function classifymuseumfile(entry: MuseumFile): keyof MuseumFilterStats {
  const tags = entry.details.map((detail) => detail.detail)
  if (
    tags.includes('Weave ZZT World') ||
    entry.archive_name.startsWith('wzzt_')
  ) {
    return 'excluded_weave'
  }
  if (
    tags.includes('Super ZZT World') ||
    tags.includes('Super ZZT Board') ||
    entry.archive_name.startsWith('szzt_')
  ) {
    return 'excluded_super'
  }
  if (!tags.includes('ZZT World')) {
    return 'excluded_no_zzt_world'
  }
  return 'included'
}

export function filtervanillazztworlds(entries: MuseumFile[]): {
  included: MuseumFile[]
  stats: MuseumFilterStats
} {
  const stats: MuseumFilterStats = {
    catalog_total: entries.length,
    included: 0,
    excluded_weave: 0,
    excluded_super: 0,
    excluded_no_zzt_world: 0,
  }
  const included: MuseumFile[] = []
  for (const entry of entries) {
    const bucket = classifymuseumfile(entry)
    if (bucket === 'included') {
      stats.included += 1
      included.push(entry)
    } else {
      stats[bucket] += 1
    }
  }
  return { included, stats }
}

const MUSEUM_API_BASE = 'https://museumofzzt.com/api/v1'
const MUSEUM_DOWNLOAD_BASE = 'https://museumofzzt.com/zgames'
const PAGE_SIZE = 25
const CATALOG_DELAY_MS = 200
const DOWNLOAD_DELAY_MS = 300
const DOWNLOAD_CONCURRENCY = 3
const MAX_RETRIES = 4

type SyncOptions = {
  root: string
  manifestonly: boolean
  force: boolean
  usemanifest: boolean
  limit?: number
}

type ManifestEntry = {
  letter: string
  filename: string
  title: string
  author: string[]
  genres: string[]
  archive_name: string
  checksum: string
  local_path: string
  size: number
  publish_date?: string
  playable_boards?: number
  total_boards?: number
  status: 'pending' | 'ok' | 'skipped' | 'failed'
  error?: string
}

type Manifest = {
  generated_at: string
  filter: 'vanilla-zzt-only'
  museum_api: 'v1/search/files'
  stats: {
    catalog_total: number
    included: number
    excluded_weave: number
    excluded_super: number
    excluded_no_zzt_world: number
    downloaded: number
    failed: number
    skipped_existing: number
  }
  entries: ManifestEntry[]
  failures: { letter: string; filename: string; error: string }[]
}

type SearchResponse = {
  status: string
  count: number
  next_offset?: number
  data: {
    results: MuseumFile[]
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseoptions(argv: string[], root: string): SyncOptions {
  let manifestonly = false
  let usemanifest = false

  for (let i = 0; i < argv.length; ++i) {
    const arg = argv[i]
    if (arg === 'manifest' || arg === '--manifest-only') {
      manifestonly = true
      continue
    }
    if (arg === 'use-manifest' || arg === '--use-manifest') {
      usemanifest = true
      continue
    }
  }

  return {
    root,
    manifestonly,
    force: readforce(argv),
    usemanifest,
    limit: readlimit(argv),
  }
}

function readexistingmanifest(root: string): Manifest | undefined {
  const manifestpath = path.join(root, MANIFEST_PATH)
  if (!existsSync(manifestpath)) {
    return undefined
  }
  return JSON.parse(readFileSync(manifestpath, 'utf8')) as Manifest
}

async function fetchjson<T>(url: string): Promise<T> {
  let lasterror: unknown
  for (let attempt = 0; attempt < MAX_RETRIES; ++attempt) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`)
      }
      return (await response.json()) as T
    } catch (error) {
      lasterror = error
      await sleep(500 * (attempt + 1))
    }
  }
  throw lasterror
}

async function crawlmuseumcatalog(): Promise<MuseumFile[]> {
  const all: MuseumFile[] = []
  let offset = 0
  for (;;) {
    const url = `${MUSEUM_API_BASE}/search/files/?offset=${offset}`
    const payload = await fetchjson<SearchResponse>(url)
    const batch = payload.data?.results ?? []
    if (batch.length === 0) {
      break
    }
    all.push(...batch)
    process.stdout.write(`\rcatalog: ${all.length} files (offset ${offset})`)
    offset += PAGE_SIZE
    await sleep(CATALOG_DELAY_MS)
  }
  process.stdout.write('\n')
  return all
}

function localpathfor(entry: Pick<MuseumFile, 'letter' | 'filename'>) {
  return path.join('archives', entry.letter, entry.filename)
}

function absolutearchivepath(
  root: string,
  entry: Pick<MuseumFile, 'letter' | 'filename'>,
) {
  return path.join(root, ARCHIVES_DIR, entry.letter, entry.filename)
}

function md5file(filepath: string): string {
  const bytes = readFileSync(filepath)
  return createHash('md5').update(bytes).digest('hex')
}

function buildmanifestentries(included: MuseumFile[]): ManifestEntry[] {
  return included.map((entry) => ({
    letter: entry.letter,
    filename: entry.filename,
    title: entry.title,
    author: entry.author,
    genres: entry.genres,
    archive_name: entry.archive_name,
    checksum: entry.checksum,
    local_path: localpathfor(entry),
    size: entry.size,
    publish_date: entry.publish_date,
    playable_boards: entry.playable_boards,
    total_boards: entry.total_boards,
    status: 'pending' as const,
  }))
}

async function downloadfile(url: string, destpath: string): Promise<void> {
  let lasterror: unknown
  for (let attempt = 0; attempt < MAX_RETRIES; ++attempt) {
    try {
      const response = await fetch(url)
      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status} for ${url}`)
      }
      mkdirSync(path.dirname(destpath), { recursive: true })
      await pipeline(response.body, createWriteStream(destpath))
      return
    } catch (error) {
      lasterror = error
      await sleep(750 * (attempt + 1))
    }
  }
  throw lasterror
}

async function downloadentries(
  root: string,
  entries: ManifestEntry[],
  opts: Pick<SyncOptions, 'force' | 'limit'>,
): Promise<{
  stats: Manifest['stats']
  failures: Manifest['failures']
}> {
  const stats = {
    catalog_total: 0,
    included: entries.length,
    excluded_weave: 0,
    excluded_super: 0,
    excluded_no_zzt_world: 0,
    downloaded: 0,
    failed: 0,
    skipped_existing: 0,
  }
  const failures: Manifest['failures'] = []
  const slice = opts.limit ? entries.slice(0, opts.limit) : entries
  const total = slice.length

  let nextindex = 0

  async function worker() {
    for (;;) {
      const slot = nextindex
      nextindex += 1
      if (slot >= slice.length) {
        return
      }
      const current = slice[slot]
      const dest = absolutearchivepath(root, current)
      const url = `${MUSEUM_DOWNLOAD_BASE}/${current.letter}/${current.filename}`

      if (
        !opts.force &&
        existsSync(dest) &&
        current.checksum &&
        md5file(dest) === current.checksum
      ) {
        current.status = 'skipped'
        stats.skipped_existing += 1
        process.stdout.write(
          `\rdownload: ${stats.downloaded + stats.skipped_existing + stats.failed}/${total}`,
        )
        continue
      }

      try {
        await downloadfile(url, dest)
        if (current.checksum && md5file(dest) !== current.checksum) {
          throw new Error(`checksum mismatch (expected ${current.checksum})`)
        }
        current.status = 'ok'
        stats.downloaded += 1
      } catch (error) {
        current.status = 'failed'
        const message = error instanceof Error ? error.message : String(error)
        current.error = message
        stats.failed += 1
        failures.push({
          letter: current.letter,
          filename: current.filename,
          error: message,
        })
      }

      process.stdout.write(
        `\rdownload: ${stats.downloaded + stats.skipped_existing + stats.failed}/${total}`,
      )
      await sleep(DOWNLOAD_DELAY_MS)
    }
  }

  const workers = Array.from(
    { length: Math.min(DOWNLOAD_CONCURRENCY, slice.length || 1) },
    () => worker(),
  )
  await Promise.all(workers)
  process.stdout.write('\n')

  return { stats, failures }
}

export async function syncmuseumzztcorpus(opts: SyncOptions): Promise<number> {
  mkdirSync(path.join(opts.root, ARCHIVES_DIR), { recursive: true })

  let filterstats: MuseumFilterStats
  let entries: ManifestEntry[]

  if (opts.usemanifest && !opts.manifestonly) {
    const existing = readexistingmanifest(opts.root)
    if (!existing) {
      throw new Error(`missing manifest at ${MANIFEST_PATH}`)
    }
    filterstats = {
      catalog_total: existing.stats.catalog_total,
      included: existing.stats.included,
      excluded_weave: existing.stats.excluded_weave,
      excluded_super: existing.stats.excluded_super,
      excluded_no_zzt_world: existing.stats.excluded_no_zzt_world,
    }
    entries = existing.entries
    console.log(`using manifest: ${entries.length} vanilla ZZT worlds`)
  } else {
    const catalog = await crawlmuseumcatalog()
    const filtered = filtervanillazztworlds(catalog)
    filterstats = filtered.stats
    entries = buildmanifestentries(filtered.included)
  }

  if (opts.manifestonly) {
    const manifest: Manifest = {
      generated_at: new Date().toISOString(),
      filter: 'vanilla-zzt-only',
      museum_api: 'v1/search/files',
      stats: {
        ...filterstats,
        downloaded: 0,
        failed: 0,
        skipped_existing: 0,
      },
      entries,
      failures: [],
    }
    writeFileSync(
      path.join(opts.root, MANIFEST_PATH),
      `${JSON.stringify(manifest, null, 2)}\n`,
    )
    console.log(
      `manifest: ${path.join(CORPUS_DIR, 'manifest.json')} (${entries.length} vanilla ZZT worlds)`,
    )
    console.log(
      `catalog=${filterstats.catalog_total} included=${filterstats.included} weave=${filterstats.excluded_weave} super=${filterstats.excluded_super} other=${filterstats.excluded_no_zzt_world}`,
    )
    return 0
  }

  const { stats: downloadstats, failures } = await downloadentries(
    opts.root,
    entries,
    opts,
  )
  const manifest: Manifest = {
    generated_at: new Date().toISOString(),
    filter: 'vanilla-zzt-only',
    museum_api: 'v1/search/files',
    stats: {
      ...filterstats,
      downloaded: downloadstats.downloaded,
      failed: downloadstats.failed,
      skipped_existing: downloadstats.skipped_existing,
    },
    entries,
    failures,
  }
  writeFileSync(
    path.join(opts.root, MANIFEST_PATH),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  console.log(
    `manifest: ${path.join(CORPUS_DIR, 'manifest.json')} downloaded=${manifest.stats.downloaded} skipped=${manifest.stats.skipped_existing} failed=${manifest.stats.failed}`,
  )
  return manifest.failures.length > 0 ? 1 : 0
}

async function runmuseumzztcorpussyncinner(argv: string[], root: string) {
  const opts = parseoptions(argv, root)
  const code = await syncmuseumzztcorpus(opts)
  return code
}

async function runmuseumzztcorpussync(ctx: TaskContext): Promise<number> {
  try {
    return await runmuseumzztcorpussyncinner(ctx.args, ctx.root)
  } catch (err) {
    console.error(err)
    return 1
  }
}

type CorpusManifestEntry = {
  letter: string
  filename: string
  archive_name: string
  local_path: string
  status: string
}

type CorpusManifest = {
  entries: CorpusManifestEntry[]
}

type ExtractOptions = {
  root: string
  stage: 'extract' | 'zss' | 'both'
  force: boolean
  limit?: number
}

type ZssManifestEntry = {
  id: string
  zss_path: string
  archive_name: string
  archive_path: string
  source_file: string
  board_index: number
  board_name: string
  stat_index: number
  x: number
  y: number
  kind: string
  compile_ok: boolean
  compile_error?: string
}

type ZssManifest = {
  generated_at: string
  stats: {
    archives_processed: number
    source_files: number
    elements: number
    compile_ok: number
    compile_fail: number
    skipped_existing: number
    parse_errors: number
  }
  entries: ZssManifestEntry[]
  errors: { path: string; error: string }[]
}

function parseextractoptions(argv: string[], root: string): ExtractOptions {
  let stage: ExtractOptions['stage'] = 'both'

  for (let i = 0; i < argv.length; ++i) {
    const arg = argv[i]
    if (arg === 'extract') {
      stage = 'extract'
      continue
    }
    if (arg === 'zss') {
      stage = 'zss'
      continue
    }
  }

  return {
    root,
    stage,
    force: readforce(argv),
    limit: readlimit(argv),
  }
}

function readcorpusmanifest(root: string): CorpusManifest {
  const manifestpath = path.join(root, MANIFEST_PATH)
  if (!existsSync(manifestpath)) {
    throw new Error(`missing manifest at ${MANIFEST_PATH}`)
  }
  return JSON.parse(readFileSync(manifestpath, 'utf8')) as CorpusManifest
}

function zipstem(filename: string): string {
  return filename.replace(/\.zip$/i, '')
}

function manifestarchivename(entry: CorpusManifestEntry): string {
  return entry.archive_name || zipstem(entry.filename)
}

/** Mirror extracted/{letter}/{zip_stem}/ under zss/. */
function zssrelpath(extractedrelpath: string, id: string): string {
  const parts = extractedrelpath.split(/[/\\]/)
  const letter = parts[0]
  const zipstemdir = parts[1]
  return path.join('zss', letter, zipstemdir, `${id}.zss`)
}

function cleanuplegacyflatzss(root: string): void {
  const zssroot = path.join(root, ZSS_DIR)
  if (!existsSync(zssroot)) {
    return
  }
  console.log(`cleaning legacy flat .zss files in ${ZSS_DIR}/`)
  execSync(`find "${zssroot}" -maxdepth 1 -name '*.zss' -delete`, {
    stdio: 'inherit',
  })
}

async function extractarchives(opts: ExtractOptions): Promise<number> {
  const manifest = readcorpusmanifest(opts.root)
  const entries = manifest.entries.filter((e) => e.status === 'ok')
  const slice = opts.limit ? entries.slice(0, opts.limit) : entries
  let extracted = 0
  let skipped = 0

  for (let i = 0; i < slice.length; ++i) {
    const entry = slice[i]
    const archivepath = path.join(
      opts.root,
      ARCHIVES_DIR,
      entry.letter,
      entry.filename,
    )
    if (!existsSync(archivepath)) {
      console.warn(`missing archive: ${archivepath}`)
      continue
    }

    const destroot = path.join(
      opts.root,
      EXTRACTED_DIR,
      entry.letter,
      zipstem(entry.filename),
    )
    try {
      const arraybuffer = readFileSync(archivepath).buffer
      const zip = await JSZip.loadAsync(arraybuffer)
      const names: string[] = []
      zip.forEach((filename) => {
        if (iszztorbrd(filename)) {
          names.push(filename)
        }
      })

      for (let n = 0; n < names.length; ++n) {
        const membername = names[n]
        const basename = path.basename(membername)
        const destpath = path.join(destroot, basename)
        if (!opts.force && existsSync(destpath)) {
          skipped += 1
          continue
        }
        const fileitem = zip.file(membername)
        if (!fileitem) {
          continue
        }
        const bytes = await fileitem.async('uint8array')
        mkdirSync(path.dirname(destpath), { recursive: true })
        writeFileSync(destpath, bytes)
        extracted += 1
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`\nextract failed ${archivepath}: ${message}`)
    }

    process.stdout.write(`\rextract: ${i + 1}/${slice.length}`)
  }
  process.stdout.write('\n')
  console.log(
    `extracted ${extracted} files (${skipped} skipped existing) from ${slice.length} archives`,
  )
  return 0
}

function processsourcefile(
  root: string,
  sourcepath: string,
  manifestentry: CorpusManifestEntry,
  opts: Pick<ExtractOptions, 'force'>,
  manifest: ZssManifest,
  existingbyid: Map<string, ZssManifestEntry>,
): void {
  const bytes = readFileSync(sourcepath)
  const content = new Uint8Array(bytes)
  const relpath = path.relative(path.join(root, EXTRACTED_DIR), sourcepath)
  const sourcefile = relpath.split(path.sep).slice(2).join('/')
  const sourcestem = path.basename(sourcefile, path.extname(sourcefile))

  const emit = (
    boardindex: number,
    boardname: string,
    layout: ZZT_BOARD_LAYOUT,
    board: ZZT_BOARD,
  ) => {
    const elements = boardcodedelements(board, layout, boardindex)
    for (let e = 0; e < elements.length; ++e) {
      const element = elements[e]
      const id = corpusentryid({
        archivename: manifestentry.archive_name,
        sourcestem,
        boardindex: element.boardindex,
        statindex: element.statindex,
        kind: element.kind,
      })
      const zssrel = zssrelpath(relpath, id)
      const zsspath = path.join(root, CORPUS_DIR, zssrel)
      if (!opts.force && existsSync(zsspath)) {
        manifest.stats.skipped_existing += 1
        const prior = existingbyid.get(id)
        if (prior) {
          manifest.entries.push(prior)
          manifest.stats.elements += 1
          if (prior.compile_ok) {
            manifest.stats.compile_ok += 1
          } else {
            manifest.stats.compile_fail += 1
          }
        }
        continue
      }
      const zsssource = elementtozss(element)
      const compiled = compilezztoop(zsssource)
      const ok = compiled.ok
      mkdirSync(path.dirname(zsspath), { recursive: true })
      writeFileSync(zsspath, zsssource)
      manifest.stats.elements += 1
      if (ok) {
        manifest.stats.compile_ok += 1
      } else {
        manifest.stats.compile_fail += 1
      }
      manifest.entries.push({
        id,
        zss_path: zssrel.replace(/\\/g, '/'),
        archive_name: manifestentry.archive_name,
        archive_path: manifestentry.local_path,
        source_file: sourcefile.replace(/\\/g, '/'),
        board_index: boardindex,
        board_name: boardname,
        stat_index: element.statindex,
        x: element.stat.x ?? 0,
        y: element.stat.y ?? 0,
        kind: element.kind,
        compile_ok: ok,
        ...(compiled.error ? { compile_error: compiled.error } : {}),
      })
    }
  }

  if (/\.zzt$/i.test(sourcepath)) {
    const parsed = zztparseworld(content)
    if (!parsed.ok) {
      manifest.stats.parse_errors += 1
      manifest.errors.push({ path: relpath, error: parsed.error })
      return
    }
    for (let bi = 0; bi < parsed.boards.length; ++bi) {
      emit(
        bi,
        parsed.boards[bi].boardname,
        layoutfromkind('zzt'),
        parsed.boards[bi],
      )
    }
    return
  }

  const parsed = zztparseboard(content)
  if (!parsed.ok) {
    manifest.stats.parse_errors += 1
    manifest.errors.push({ path: relpath, error: parsed.error })
    return
  }
  emit(0, parsed.board.boardname, layoutfromkind(parsed.layout), parsed.board)
}

function buildmanifestlookup(
  entries: CorpusManifestEntry[],
): Map<string, CorpusManifestEntry> {
  const map = new Map<string, CorpusManifestEntry>()
  for (let i = 0; i < entries.length; ++i) {
    const entry = entries[i]
    const key = `${entry.letter}/${zipstem(entry.filename)}`
    map.set(key, entry)
  }
  return map
}

function convertextractedtozss(opts: ExtractOptions): number {
  const corpusmanifest = readcorpusmanifest(opts.root)
  const okentries = corpusmanifest.entries.filter((e) => e.status === 'ok')
  const lookup = buildmanifestlookup(
    opts.limit ? okentries.slice(0, opts.limit) : okentries,
  )

  const extractedroot = path.join(opts.root, EXTRACTED_DIR)
  if (!existsSync(extractedroot)) {
    throw new Error(
      `missing extracted dir at ${EXTRACTED_DIR} — run extract first`,
    )
  }

  mkdirSync(path.join(opts.root, ZSS_DIR), { recursive: true })

  if (opts.force) {
    cleanuplegacyflatzss(opts.root)
  }

  const existingbyid = new Map<string, ZssManifestEntry>()
  if (!opts.force) {
    const existingpath = path.join(opts.root, ZSS_MANIFEST_PATH)
    if (existsSync(existingpath)) {
      const existing = JSON.parse(
        readFileSync(existingpath, 'utf8'),
      ) as ZssManifest
      for (let i = 0; i < existing.entries.length; ++i) {
        existingbyid.set(existing.entries[i].id, existing.entries[i])
      }
    }
  }

  const manifest: ZssManifest = {
    generated_at: new Date().toISOString(),
    stats: {
      archives_processed: 0,
      source_files: 0,
      elements: 0,
      compile_ok: 0,
      compile_fail: 0,
      skipped_existing: 0,
      parse_errors: 0,
    },
    entries: [],
    errors: [],
  }

  const letters = readdirSync(extractedroot, { withFileTypes: true })
  for (let li = 0; li < letters.length; ++li) {
    const letterentry = letters[li]
    if (!letterentry.isDirectory()) {
      continue
    }
    const letter = letterentry.name
    const letterdir = path.join(extractedroot, letter)
    const stems = readdirSync(letterdir, { withFileTypes: true })
    for (let si = 0; si < stems.length; ++si) {
      const stementry = stems[si]
      if (!stementry.isDirectory()) {
        continue
      }
      const stem = stementry.name
      const key = `${letter}/${stem}`
      const manifestentry = lookup.get(key)
      if (!manifestentry) {
        continue
      }
      manifest.stats.archives_processed += 1
      const stemdir = path.join(letterdir, stem)
      const sources = collectzztcorpussourcefiles(stemdir)
      for (let fi = 0; fi < sources.length; ++fi) {
        manifest.stats.source_files += 1
        processsourcefile(
          opts.root,
          sources[fi],
          manifestentry,
          opts,
          manifest,
          existingbyid,
        )
      }
      process.stdout.write(
        `\rzss: ${manifest.stats.archives_processed}/${lookup.size}`,
      )
    }
  }
  process.stdout.write('\n')

  writeFileSync(
    path.join(opts.root, ZSS_MANIFEST_PATH),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  console.log(
    `zss manifest: ${ZSS_MANIFEST_PATH} elements=${manifest.stats.elements} compile_ok=${manifest.stats.compile_ok} compile_fail=${manifest.stats.compile_fail} parse_errors=${manifest.stats.parse_errors}`,
  )
  return manifest.stats.parse_errors > 0 ? 1 : 0
}

export async function extractmuseumzztcorpus(
  opts: ExtractOptions,
): Promise<number> {
  if (opts.stage === 'extract' || opts.stage === 'both') {
    const code = await extractarchives(opts)
    if (code !== 0) {
      return code
    }
  }
  if (opts.stage === 'zss' || opts.stage === 'both') {
    return convertextractedtozss(opts)
  }
  return 0
}

async function runmuseumzztcorpusextractinner(argv: string[], root: string) {
  const opts = parseextractoptions(argv, root)
  const code = await extractmuseumzztcorpus(opts)
  return code
}

async function runmuseumzztcorpusextract(ctx: TaskContext): Promise<number> {
  try {
    return await runmuseumzztcorpusextractinner(ctx.args, ctx.root)
  } catch (err) {
    console.error(err)
    return 1
  }
}

type ScanHit = ReturnType<typeof corpusscanline>[number]

type TaskOptions = {
  dryrun: boolean
  limit?: number
  verify: boolean
}

function parseprofanityoptions(argv: string[]): TaskOptions {
  let dryrun = false
  let verify = false

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
  }

  return { dryrun, limit: readlimit(argv), verify }
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
  const opts = parseprofanityoptions(argv)
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
  const opts = parseprofanityoptions(argv)
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
    console.error(
      'sanitize incomplete — remaining hits; extend word list or allowlist',
    )
    return 1
  }
  return 0
}

async function runzztcorpusprofanityinner(args: string[]) {
  const mode = args[0] ?? 'scan'
  const rest = args.slice(1)
  return mode === 'sanitize'
    ? sanitizezztcorpus(rest)
    : scanzztcorpusprofanity(rest)
}

async function runzztcorpusprofanity(ctx: TaskContext): Promise<number> {
  try {
    return await runzztcorpusprofanityinner(ctx.args)
  } catch (err) {
    console.error(err)
    return 1
  }
}

type CorpusManifestEntry = {
  letter: string
  filename: string
  archive_name: string
  local_path: string
  status: string
}

type CorpusManifest = {
  entries: CorpusManifestEntry[]
}

type ScreenshotOptions = {
  root: string
  force: boolean
  limit?: number
}

type ScreenshotManifestEntry = {
  id: string
  png_path: string
  archive_name: string
  archive_path: string
  source_file: string
  board_index: number
  board_name: string
}

type ScreenshotManifest = {
  generated_at: string
  stats: {
    archives_processed: number
    source_files: number
    boards: number
    skipped_existing: number
    parse_errors: number
    render_errors: number
  }
  entries: ScreenshotManifestEntry[]
  errors: { path: string; error: string }[]
}

export function parsescreenshotoptions(
  argv: string[],
  root = process.cwd(),
): ScreenshotOptions {
  return { root, force: readforce(argv), limit: readlimit(argv) }
}

type ScreenshotDeps = {
  PNG: typeof import('pngjs').PNG
  loadcoolregionsbowelementlibrary: typeof import('ops/lib/coolregionsbowbook').loadcoolregionsbowelementlibrary
  importzztboardstobook: typeof import('zss/feature/parse/zzt').importzztboardstobook
  defaultcapturemedia: typeof import('zss/gadget/capture/rasterize').defaultcapturemedia
  rasterizelayerstorgba: typeof import('zss/gadget/capture/rasterize').rasterizelayerstorgba
  ispresent: typeof import('zss/mapping/types').ispresent
  memoryreadboardbyaddress: typeof import('zss/memory/boards').memoryreadboardbyaddress
  memoryreadgadgetlayers: typeof import('zss/memory/rendering').memoryreadgadgetlayers
  memoryclearbook: typeof import('zss/memory/session').memoryclearbook
  memorywritebook: typeof import('zss/memory/session').memorywritebook
  BOARD_WIDTH: number
  BOARD_HEIGHT: number
}

async function loadscreenshotdeps(): Promise<ScreenshotDeps> {
  const [
    { PNG },
    { loadcoolregionsbowelementlibrary },
    { importzztboardstobook },
    rasterize,
    { ispresent },
    boards,
    rendering,
    session,
    memorytypes,
  ] = await Promise.all([
    import('pngjs'),
    import('ops/lib/coolregionsbowbook'),
    import('zss/feature/parse/zzt'),
    import('zss/gadget/capture/rasterize'),
    import('zss/mapping/types'),
    import('zss/memory/boards'),
    import('zss/memory/rendering'),
    import('zss/memory/session'),
    import('zss/memory/types'),
  ])
  return {
    PNG,
    loadcoolregionsbowelementlibrary,
    importzztboardstobook,
    defaultcapturemedia: rasterize.defaultcapturemedia,
    rasterizelayerstorgba: rasterize.rasterizelayerstorgba,
    ispresent,
    memoryreadboardbyaddress: boards.memoryreadboardbyaddress,
    memoryreadgadgetlayers: rendering.memoryreadgadgetlayers,
    memoryclearbook: session.memoryclearbook,
    memorywritebook: session.memorywritebook,
    BOARD_WIDTH: memorytypes.BOARD_WIDTH,
    BOARD_HEIGHT: memorytypes.BOARD_HEIGHT,
  }
}

function screenshotrelpath(extractedrelpath: string, id: string): string {
  const parts = extractedrelpath.split(/[/\\]/)
  const letter = parts[0]
  const zipstemdir = parts[1]
  return path.join('screenshots', letter, zipstemdir, `${id}.png`)
}

function writepng(
  PNG: ScreenshotDeps['PNG'],
  filepath: string,
  width: number,
  height: number,
  rgba: Uint8ClampedArray,
) {
  const png = new PNG({ width, height })
  png.data = Buffer.from(rgba)
  const packed = PNG.sync.write(png)
  writeFileSync(filepath, packed)
}

function errormessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function processscreenshotsource(
  deps: ScreenshotDeps,
  root: string,
  sourcepath: string,
  manifestentry: CorpusManifestEntry,
  opts: Pick<ScreenshotOptions, 'force'>,
  manifest: ScreenshotManifest,
  media: ReturnType<ScreenshotDeps['defaultcapturemedia']>,
) {
  const bytes = readFileSync(sourcepath)
  const content = new Uint8Array(bytes)
  const relpath = path.relative(path.join(root, EXTRACTED_DIR), sourcepath)
  const sourcefile = relpath.split(path.sep).slice(2).join('/')
  const sourcestem = path.basename(sourcefile, path.extname(sourcefile))

  const renderboards = (
    boardindexstart: number,
    zztboards: ZZT_BOARD[],
    tilewidth: number,
    tileheight: number,
    croppedfromszzt: boolean,
  ) => {
    let bookid = ''
    try {
      deps.loadcoolregionsbowelementlibrary()
      const { book, boardaddresses } = deps.importzztboardstobook(zztboards, {
        startboard: -1,
        tilewidth,
        tileheight,
        croppedfromszzt,
      })
      bookid = book.id
      deps.memorywritebook(book)
      for (let bi = 0; bi < boardaddresses.length; bi++) {
        const boardindex = boardindexstart + bi
        const boardname = zztboards[bi]?.boardname ?? ''
        const id = corpusboardscreenshotid({
          archivename: manifestarchivename(manifestentry),
          sourcestem,
          boardindex,
        })
        const pngrel = screenshotrelpath(relpath, id)
        const pngpath = path.join(root, CORPUS_DIR, pngrel)
        if (!opts.force && existsSync(pngpath)) {
          manifest.stats.skipped_existing += 1
          manifest.entries.push({
            id,
            png_path: pngrel.replace(/\\/g, '/'),
            archive_name: manifestentry.archive_name,
            archive_path: manifestentry.local_path,
            source_file: sourcefile.replace(/\\/g, '/'),
            board_index: boardindex,
            board_name: boardname,
          })
          continue
        }
        try {
          const board = deps.memoryreadboardbyaddress(boardaddresses[bi])
          if (!deps.ispresent(board) || !deps.ispresent(board.terrain)) {
            continue
          }
          const gadgetlayers = deps.memoryreadgadgetlayers('flat', board)
          const { width, height, rgba } = deps.rasterizelayerstorgba(
            gadgetlayers.layers,
            media.charset,
            media.palette,
          )
          mkdirSync(path.dirname(pngpath), { recursive: true })
          writepng(deps.PNG, pngpath, width, height, rgba)
          manifest.stats.boards += 1
          manifest.entries.push({
            id,
            png_path: pngrel.replace(/\\/g, '/'),
            archive_name: manifestentry.archive_name,
            archive_path: manifestentry.local_path,
            source_file: sourcefile.replace(/\\/g, '/'),
            board_index: boardindex,
            board_name: boardname,
          })
        } catch (error) {
          manifest.stats.render_errors += 1
          manifest.errors.push({
            path: `${relpath}#b${boardindex}`,
            error: errormessage(error),
          })
        }
      }
    } catch (error) {
      manifest.stats.render_errors += 1
      manifest.errors.push({
        path: `${relpath}#b${boardindexstart}`,
        error: errormessage(error),
      })
    } finally {
      if (bookid) {
        deps.memoryclearbook(bookid)
      }
    }
  }

  if (/\.zzt$/i.test(sourcepath)) {
    const parsed = zztparseworld(content)
    if (!parsed.ok) {
      manifest.stats.parse_errors += 1
      manifest.errors.push({ path: relpath, error: parsed.error })
      return
    }
    renderboards(0, parsed.boards, deps.BOARD_WIDTH, deps.BOARD_HEIGHT, false)
    return
  }

  const parsed = zztparseboard(content)
  if (!parsed.ok) {
    manifest.stats.parse_errors += 1
    manifest.errors.push({ path: relpath, error: parsed.error })
    return
  }
  const usedszzt = parsed.layout === 'szzt'
  renderboards(
    0,
    [parsed.board],
    usedszzt ? 96 : deps.BOARD_WIDTH,
    usedszzt ? 80 : deps.BOARD_HEIGHT,
    usedszzt,
  )
}

export async function renderscreenshots(
  opts: ScreenshotOptions,
): Promise<number> {
  const deps = await loadscreenshotdeps()
  const corpusmanifest = readcorpusmanifest(opts.root)
  const okentries = corpusmanifest.entries.filter((e) => e.status === 'ok')
  const lookup = buildmanifestlookup(
    opts.limit ? okentries.slice(0, opts.limit) : okentries,
  )

  const extractedroot = path.join(opts.root, EXTRACTED_DIR)
  if (!existsSync(extractedroot)) {
    throw new Error(
      `missing extracted dir at ${EXTRACTED_DIR} — run extract first`,
    )
  }

  mkdirSync(path.join(opts.root, SCREENSHOTS_DIR), { recursive: true })

  const manifest: ScreenshotManifest = {
    generated_at: new Date().toISOString(),
    stats: {
      archives_processed: 0,
      source_files: 0,
      boards: 0,
      skipped_existing: 0,
      parse_errors: 0,
      render_errors: 0,
    },
    entries: [],
    errors: [],
  }

  const manifestpath = path.join(opts.root, SCREENSHOTS_MANIFEST_PATH)

  const writemanifest = () => {
    manifest.generated_at = new Date().toISOString()
    writeFileSync(manifestpath, `${JSON.stringify(manifest, null, 2)}\n`)
  }

  const media = deps.defaultcapturemedia()

  const letters = readdirSync(extractedroot, { withFileTypes: true })
  for (let li = 0; li < letters.length; ++li) {
    const letterentry = letters[li]
    if (!letterentry.isDirectory()) {
      continue
    }
    const letter = letterentry.name
    const letterdir = path.join(extractedroot, letter)
    const stems = readdirSync(letterdir, { withFileTypes: true })
    for (let si = 0; si < stems.length; ++si) {
      const stementry = stems[si]
      if (!stementry.isDirectory()) {
        continue
      }
      const stem = stementry.name
      const key = `${letter}/${stem}`
      const manifestentry = lookup.get(key)
      if (!manifestentry) {
        continue
      }
      manifest.stats.archives_processed += 1
      const stemdir = path.join(letterdir, stem)
      const sources = collectzztcorpussourcefiles(stemdir)
      for (let fi = 0; fi < sources.length; ++fi) {
        manifest.stats.source_files += 1
        processscreenshotsource(
          deps,
          opts.root,
          sources[fi],
          manifestentry,
          opts,
          manifest,
          media,
        )
      }
      process.stdout.write(
        `\rscreenshots: ${manifest.stats.archives_processed}/${lookup.size}`,
      )
      writemanifest()
    }
  }
  process.stdout.write('\n')

  writemanifest()
  console.log(
    `screenshots manifest: ${SCREENSHOTS_MANIFEST_PATH} boards=${manifest.stats.boards} skipped=${manifest.stats.skipped_existing} parse_errors=${manifest.stats.parse_errors} render_errors=${manifest.stats.render_errors}`,
  )
  return 0
}

function runcontentcli(ctx: TaskContext): number {
  const task = ctx.args[0]
  const arg = ctx.args[1] ?? ''
  const extra = ctx.args.slice(2)
  if (!task || !arg) {
    process.stderr.write(
      'usage: <build|validate|codepage-validate> <path> [--out ...]\n',
    )
    return 1
  }
  return runjest(
    ctx,
    'ops/tests/unit/feature/content/contentbook.cli.test.ts',
    ['--no-coverage', '--runTestsByPath'],
    {
      env: {
        CONTENT_CLI_TASK: task,
        CONTENT_CLI_ARG: arg,
        CONTENT_CLI_EXTRA: JSON.stringify(extra),
      },
    },
  )
}

export const CONTENT_TASKS: TaskDef[] = [
  def('content:book:build', {
    description:
      'Build importable book JSON from template path (pass path as extra args)',
    run: handler((ctx) =>
      runcontentcli({ ...ctx, args: ['build', ...ctx.args] }),
    ),
  }),
  def('content:book:validate', {
    description: 'Validate book JSON (pass path as extra args)',
    run: handler((ctx) =>
      runcontentcli({ ...ctx, args: ['validate', ...ctx.args] }),
    ),
  }),
  def('content:book:test', {
    description: 'Jest content book tests',
    tags: ['ci'],
    run: jestexec('ops/tests/unit/feature/content/contentbook.test.ts', [
      '--no-coverage',
    ]),
  }),
  def('content:codepage:validate', {
    description: 'Validate codepage JSON (pass path as extra args)',
    run: handler((ctx) =>
      runcontentcli({ ...ctx, args: ['codepage-validate', ...ctx.args] }),
    ),
  }),
  def('content:zzt:corpus:sync', {
    description:
      'Crawl Museum of ZZT and download vanilla ZZT world ZIPs into ops/fixtures/zzt/corpus/archives (gitignored)',
    tags: ['slow'],
    run: handler(runmuseumzztcorpussync),
  }),
  def('content:zzt:corpus:manifest', {
    description:
      'Crawl Museum of ZZT and write vanilla ZZT manifest only (no downloads)',
    run: handler((ctx) =>
      runmuseumzztcorpussync({ ...ctx, args: ['manifest', ...ctx.args] }),
    ),
  }),
  def('content:zzt:corpus:extract', {
    description:
      'Unzip vanilla ZZT archives into ops/fixtures/zzt/corpus/extracted (.zzt/.brd only)',
    tags: ['slow'],
    run: handler((ctx) =>
      runmuseumzztcorpusextract({ ...ctx, args: ['extract', ...ctx.args] }),
    ),
  }),
  def('content:zzt:corpus:zss', {
    description:
      'Convert extracted ZZT/BRD OOP into ops/fixtures/zzt/corpus/zss/*.zss + manifest',
    tags: ['slow'],
    run: handler((ctx) =>
      runmuseumzztcorpusextract({ ...ctx, args: ['zss', ...ctx.args] }),
    ),
  }),
  def('content:zzt:corpus:build', {
    description:
      'Extract Museum archives, build ZZT OOP → .zss corpus, and sanitize profanity/slurs',
    tags: ['slow'],
    deps: [
      'content:zzt:corpus:extract',
      'content:zzt:corpus:zss',
      'content:zzt:corpus:sanitize',
    ],
    run: { kind: 'tasks' },
  }),
  def('content:zzt:corpus:profanity:scan', {
    description:
      'Scan ops/fixtures/zzt/corpus/zss for profanity and slurs; write profanity-report.json',
    tags: ['slow'],
    run: handler((ctx) =>
      runzztcorpusprofanity({ ...ctx, args: ['scan', ...ctx.args] }),
    ),
  }),
  def('content:zzt:corpus:profanity:verify', {
    description:
      'Fail if corpus zss still contains profanity or slurs (CI gate)',
    tags: ['ci', 'slow'],
    run: handler((ctx) =>
      runzztcorpusprofanity({ ...ctx, args: ['scan', 'verify', ...ctx.args] }),
    ),
  }),
  def('content:zzt:corpus:sanitize', {
    description:
      'Redact profanity and racial slurs in ops/fixtures/zzt/corpus/zss/*.zss',
    tags: ['slow'],
    run: handler((ctx) =>
      runzztcorpusprofanity({ ...ctx, args: ['sanitize', ...ctx.args] }),
    ),
  }),
  def('content:zzt:corpus:screenshots', {
    description:
      'Render board PNGs from extracted ZZT/BRD into ops/fixtures/zzt/corpus/screenshots (gitignored)',
    tags: ['slow'],
    run: handler((ctx) =>
      runjest(
        ctx,
        'ops/tests/integration/zzt/corpus-screenshots.test.ts',
        ['--runTestsByPath', '--no-coverage'],
        {
          env: {
            ZSS_JEST_INCLUDE_CORPUS_SCREENSHOTS: '1',
            ZSS_TASK_ARGS: ctx.args.join(' '),
          },
        },
      ),
    ),
  }),
]
