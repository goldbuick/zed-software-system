import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

import { corpusboardscreenshotid } from 'ops/lib/content/zztcorpus'
import { loadcoolregionsbowelementlibrary } from 'ops/lib/coolregionsbowbook'
import { PNG } from 'pngjs'
import { importzztboardstobook } from 'zss/feature/parse/zzt'
import { zztparseboard, zztparseworld } from 'zss/feature/parse/zztbinparse'
import type { ZZT_BOARD } from 'zss/feature/parse/zztformattypes'
import {
  defaultcapturemedia,
  rasterizelayerstorgba,
} from 'zss/gadget/capture/rasterize'
import { ispresent } from 'zss/mapping/types'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import { memoryreadgadgetlayers } from 'zss/memory/rendering'
import { memoryclearbook, memorywritebook } from 'zss/memory/session'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

const CORPUS_DIR = path.join('ops', 'fixtures', 'zzt', 'corpus')
const EXTRACTED_DIR = path.join(CORPUS_DIR, 'extracted')
const SCREENSHOTS_DIR = path.join(CORPUS_DIR, 'screenshots')
const MANIFEST_PATH = path.join(CORPUS_DIR, 'manifest.json')
const SCREENSHOTS_MANIFEST_PATH = path.join(SCREENSHOTS_DIR, 'manifest.json')

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

export function parsescreenshotoptions(argv: string[]): ScreenshotOptions {
  const root = process.cwd()
  let force = false
  let limit: number | undefined

  for (let i = 0; i < argv.length; ++i) {
    const arg = argv[i]
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

  return { root, force, limit }
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

function iszztorbrd(name: string): boolean {
  return /\.(zzt|brd)$/i.test(name)
}

function screenshotrelpath(extractedrelpath: string, id: string): string {
  const parts = extractedrelpath.split(/[/\\]/)
  const letter = parts[0]
  const zipstemdir = parts[1]
  return path.join('screenshots', letter, zipstemdir, `${id}.png`)
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

function writepng(
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

function processsourcefile(
  root: string,
  sourcepath: string,
  manifestentry: CorpusManifestEntry,
  opts: Pick<ScreenshotOptions, 'force'>,
  manifest: ScreenshotManifest,
  media: ReturnType<typeof defaultcapturemedia>,
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
      loadcoolregionsbowelementlibrary()
      const { book, boardaddresses } = importzztboardstobook(zztboards, {
        startboard: -1,
        tilewidth,
        tileheight,
        croppedfromszzt,
      })
      bookid = book.id
      memorywritebook(book)
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
          const board = memoryreadboardbyaddress(boardaddresses[bi])
          if (!ispresent(board) || !ispresent(board.terrain)) {
            continue
          }
          const gadgetlayers = memoryreadgadgetlayers('flat', board)
          const { width, height, rgba } = rasterizelayerstorgba(
            gadgetlayers.layers,
            media.charset,
            media.palette,
          )
          mkdirSync(path.dirname(pngpath), { recursive: true })
          writepng(pngpath, width, height, rgba)
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
        memoryclearbook(bookid)
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
    renderboards(0, parsed.boards, BOARD_WIDTH, BOARD_HEIGHT, false)
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
    usedszzt ? 96 : BOARD_WIDTH,
    usedszzt ? 80 : BOARD_HEIGHT,
    usedszzt,
  )
}

export function renderscreenshots(opts: ScreenshotOptions): number {
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

  const media = defaultcapturemedia()

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
