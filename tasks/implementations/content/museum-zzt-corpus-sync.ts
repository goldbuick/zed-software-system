import { createHash } from 'node:crypto'
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'

import {
  type MuseumFile,
  type MuseumFilterStats,
  filtervanillazztworlds,
} from './museum-zzt-filter'

const MUSEUM_API_BASE = 'https://museumofzzt.com/api/v1'
const MUSEUM_DOWNLOAD_BASE = 'https://museumofzzt.com/zgames'
const PAGE_SIZE = 25
const CATALOG_DELAY_MS = 200
const DOWNLOAD_DELAY_MS = 300
const DOWNLOAD_CONCURRENCY = 3
const MAX_RETRIES = 4

const CORPUS_DIR = path.join('ops', 'fixtures', 'zzt', 'corpus')
const ARCHIVES_DIR = path.join(CORPUS_DIR, 'archives')
const MANIFEST_PATH = path.join(CORPUS_DIR, 'manifest.json')

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

function parseoptions(argv: string[]): SyncOptions {
  const root = process.cwd()
  let manifestonly = false
  let force = false
  let usemanifest = false
  let limit: number | undefined

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
    if (arg === 'force' || arg === '--force') {
      force = true
      continue
    }
    if (arg === 'limit' || arg === '--limit') {
      const next = argv[i + 1]
      if (!next) {
        throw new Error('limit requires a number')
      }
      limit = Number.parseInt(next, 10)
      if (!Number.isFinite(limit) || limit < 1) {
        throw new Error('limit must be a positive integer')
      }
      ++i
      continue
    }
  }

  return { root, manifestonly, force, usemanifest, limit }
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

async function main() {
  const opts = parseoptions(process.argv.slice(2))
  const code = await syncmuseumzztcorpus(opts)
  process.exit(code)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
