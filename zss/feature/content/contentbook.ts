import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { createsid } from 'zss/mapping/guid'
import { MAYBE, ispresent, isstring } from 'zss/mapping/types'
import { memoryboundariesclear } from 'zss/memory/boundaries'
import {
  memorycreatebook,
  memoryexportbookasjson,
  memoryimportbookfromjson,
} from 'zss/memory/bookoperations'
import {
  memoryimportcodepagefromjson,
  memoryreadcodepagedata,
  memoryreadcodepagename,
  memoryreadcodepagetype,
  memoryreadcodepagetypeasstring,
} from 'zss/memory/codepageoperations'
import { memoryresetbooks } from 'zss/memory/session'
import { CODE_PAGE, CODE_PAGE_TYPE } from 'zss/memory/types'

export const CODEPAGE_TYPES = [
  'board',
  'object',
  'terrain',
  'charset',
  'palette',
  'loader',
  'error',
] as const

export type CODEPAGE_TYPE_NAME = (typeof CODEPAGE_TYPES)[number]

export type CONTENT_MANIFEST = {
  name: string
  pages: string[]
}

export type CONTENT_PAGE_JSON = {
  id?: string
  code?: string
  board?: Record<string, unknown>
  object?: Record<string, unknown>
  terrain?: Record<string, unknown>
  charset?: Record<string, unknown>
  palette?: Record<string, unknown>
}

export type CONTENT_BOOK_EXPORT = {
  exported: string
  data: ReturnType<typeof memoryexportbookasjson>
}

export type CONTENT_CODEPAGE_EXPORT = {
  exported: string
  data: Record<string, unknown>
}

export function parsecodepagefilename(
  filepath: string,
): { name: string; type: CODEPAGE_TYPE_NAME } | undefined {
  const base = path.basename(filepath)
  const match = /^(.+)\.(\w+)\.json$/.exec(base)
  if (!ispresent(match)) {
    return undefined
  }
  const [, name, type] = match
  if (!CODEPAGE_TYPES.includes(type as CODEPAGE_TYPE_NAME)) {
    return undefined
  }
  return { name, type: type as CODEPAGE_TYPE_NAME }
}

export function unwrappagejson(raw: unknown): CONTENT_PAGE_JSON {
  if (
    ispresent(raw) &&
    typeof raw === 'object' &&
    'data' in raw &&
    ispresent((raw as { data?: unknown }).data)
  ) {
    return (raw as { data: CONTENT_PAGE_JSON }).data
  }
  return (raw ?? {}) as CONTENT_PAGE_JSON
}

export function unwrapbookjson(raw: unknown): {
  exported?: string
  data: Record<string, unknown>
} {
  if (
    ispresent(raw) &&
    typeof raw === 'object' &&
    'data' in raw &&
    ispresent((raw as { data?: unknown }).data)
  ) {
    const envelope = raw as { exported?: string; data: Record<string, unknown> }
    return envelope
  }
  return { data: (raw ?? {}) as Record<string, unknown> }
}

export function pagejsonfromfile(filepath: string): CONTENT_PAGE_JSON {
  const raw = JSON.parse(readFileSync(filepath, 'utf8')) as unknown
  return unwrappagejson(raw)
}

export function codepagefromjson(flat: CONTENT_PAGE_JSON): CODE_PAGE {
  if (!isstring(flat.code) || !flat.code.trim()) {
    throw new Error('codepage json missing required code field')
  }
  const id = flat.id ?? createsid()
  const cp = memoryimportcodepagefromjson({
    id,
    code: flat.code,
    board: flat.board,
    object: flat.object,
    terrain: flat.terrain,
    charset: flat.charset,
    palette: flat.palette,
  })
  if (!ispresent(cp)) {
    throw new Error('failed to import codepage from json')
  }
  memoryreadcodepagedata(cp)
  return cp
}

export function readmanifest(manifestpath: string): CONTENT_MANIFEST {
  const raw = JSON.parse(readFileSync(manifestpath, 'utf8')) as CONTENT_MANIFEST
  if (!isstring(raw.name) || !raw.name.trim()) {
    throw new Error(`manifest missing name: ${manifestpath}`)
  }
  if (!Array.isArray(raw.pages) || raw.pages.length === 0) {
    throw new Error(`manifest missing pages: ${manifestpath}`)
  }
  return raw
}

export function buildbookfrommanifest(
  manifestpath: string,
  rootdir = path.dirname(manifestpath),
): CONTENT_BOOK_EXPORT {
  memoryboundariesclear()
  const manifest = readmanifest(manifestpath)
  const pages: CODE_PAGE[] = []
  for (let i = 0; i < manifest.pages.length; ++i) {
    const relpath = manifest.pages[i]
    const pagepath = path.resolve(rootdir, relpath)
    const pagejson = pagejsonfromfile(pagepath)
    pages.push(codepagefromjson(pagejson))
  }
  const book = memorycreatebook(pages)
  book.name = manifest.name
  const data = memoryexportbookasjson(book)
  if (!ispresent(data)) {
    throw new Error('failed to export book json')
  }
  return {
    exported: `${manifest.name}.book.json`,
    data,
  }
}

export function wrapcodepageexport(
  pagepath: string,
  data: Record<string, unknown>,
): CONTENT_CODEPAGE_EXPORT {
  const parsed = parsecodepagefilename(pagepath)
  const basename = parsed
    ? `${parsed.name}.${parsed.type}.json`
    : path.basename(pagepath)
  return {
    exported: basename,
    data,
  }
}

export function writebookexport(
  exportbook: CONTENT_BOOK_EXPORT,
  outpath: string,
): void {
  mkdirSync(path.dirname(outpath), { recursive: true })
  writeFileSync(outpath, `${JSON.stringify(exportbook, null, 2)}\n`, 'utf8')
}

export function validatecodepagefile(filepath: string): string[] {
  const errors: string[] = []
  memoryboundariesclear()
  const parsed = parsecodepagefilename(filepath)
  if (!ispresent(parsed)) {
    errors.push(`filename must be {name}.{type}.json: ${filepath}`)
    return errors
  }
  let pagejson: CONTENT_PAGE_JSON
  try {
    pagejson = pagejsonfromfile(filepath)
  } catch (err) {
    errors.push(
      `invalid json: ${err instanceof Error ? err.message : String(err)}`,
    )
    return errors
  }
  let cp: CODE_PAGE
  try {
    cp = codepagefromjson(pagejson)
  } catch (err) {
    errors.push(
      `import failed: ${err instanceof Error ? err.message : String(err)}`,
    )
    return errors
  }
  const actualtype = memoryreadcodepagetypeasstring(cp)
  if (actualtype !== parsed.type) {
    errors.push(
      `type mismatch: filename .${parsed.type}.json but code is @${actualtype}`,
    )
  }
  if (memoryreadcodepagetype(cp) === CODE_PAGE_TYPE.ERROR) {
    errors.push(`invalid codepage type for ${filepath}`)
  }
  return errors
}

export function validatebookexport(exportbook: CONTENT_BOOK_EXPORT): string[] {
  const errors: string[] = []
  memoryboundariesclear()
  memoryresetbooks([])
  const book = memoryimportbookfromjson(exportbook.data)
  if (!ispresent(book)) {
    errors.push('memoryimportbookfromjson failed')
    return errors
  }
  memoryresetbooks([book])

  let hasplayer = false
  let hastitleboard = false
  for (let i = 0; i < book.pages.length; ++i) {
    const page = book.pages[i]
    const pagename = memoryreadcodepagename(page)
    const pagetype = memoryreadcodepagetype(page)
    if (pagetype === CODE_PAGE_TYPE.OBJECT && pagename === 'player') {
      hasplayer = true
    }
    if (pagetype === CODE_PAGE_TYPE.BOARD && pagename === 'title') {
      hastitleboard = true
      const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(page)
      if (!ispresent(board)) {
        errors.push('title board page missing board runtime')
      } else if (!isnumber(board.startx) || !isnumber(board.starty)) {
        errors.push('title board missing startx/starty')
      }
    }
  }

  if (!hasplayer) {
    errors.push('book missing @object player page')
  }
  if (!hastitleboard) {
    errors.push('book missing @board title page')
  }
  return errors
}

function isnumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value)
}

export function buildborderterrain(kind: string, width = 60, height = 25) {
  const terrain: { kind: string; x: number; y: number }[] = []
  for (let x = 0; x < width; ++x) {
    terrain.push({ kind, x, y: 0 })
    terrain.push({ kind, x, y: height - 1 })
  }
  for (let y = 1; y < height - 1; ++y) {
    terrain.push({ kind, x: 0, y })
    terrain.push({ kind, x: width - 1, y })
  }
  return terrain
}
