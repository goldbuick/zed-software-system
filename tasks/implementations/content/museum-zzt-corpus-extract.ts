import { execSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

import JSZip from 'jszip'
import {
  type ZZT_BOARD_LAYOUT,
  boardcodedelements,
  corpusentryid,
  elementtozss,
  layoutfromkind,
} from 'ops/lib/content/zztcorpus'
import { compileparse } from 'zss/feature/lang/backend/typescript/compileparse'
import { zztparseboard, zztparseworld } from 'zss/feature/parse/zztbinparse'
import type { ZZT_BOARD } from 'zss/feature/parse/zztformattypes'

const CORPUS_DIR = path.join('ops', 'fixtures', 'zzt', 'corpus')
const ARCHIVES_DIR = path.join(CORPUS_DIR, 'archives')
const EXTRACTED_DIR = path.join(CORPUS_DIR, 'extracted')
const ZSS_DIR = path.join(CORPUS_DIR, 'zss')
const MANIFEST_PATH = path.join(CORPUS_DIR, 'manifest.json')
const ZSS_MANIFEST_PATH = path.join(ZSS_DIR, 'manifest.json')

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

function parseoptions(argv: string[]): ExtractOptions {
  const root = process.cwd()
  let stage: ExtractOptions['stage'] = 'both'
  let force = false
  let limit: number | undefined

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

  return { root, stage, force, limit }
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

function iszztorbrd(name: string): boolean {
  return /\.(zzt|brd)$/i.test(name)
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

function compileok(source: string): { ok: boolean; error?: string } {
  const result = compileparse(source)
  const ok = !(result.errors && result.errors.length > 0) && !!result.cst
  return {
    ok,
    error: ok ? undefined : result.errors?.[0]?.message,
  }
}

function collectsourcefiles(dir: string): string[] {
  const out: string[] = []
  function walk(current: string) {
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
      const compiled = compileok(zsssource)
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
      const sources = collectsourcefiles(stemdir)
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
    const code = convertextractedtozss(opts)
    if (code !== 0) {
      return code
    }
    const { sanitizezztcorpus } = await import('./zzt-corpus-profanity')
    return sanitizezztcorpus([])
  }
  return 0
}

async function main() {
  const opts = parseoptions(process.argv.slice(2))
  const code = await extractmuseumzztcorpus(opts)
  process.exit(code)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
