import { memoryreadcodepagename } from 'zss/memory/codepageoperations'
import { BOARD_SIZE } from 'zss/memory/types'
import type { BOOK, CODE_PAGE } from 'zss/memory/types'

export type ZED_CAFE_EXPORT_PATH_FILE = {
  path: string
  bytes: Uint8Array
}

const ZEDCAFE_DIRNAME_NAME_MAX_LEN = 48

const DIR_SEG = '(?:[a-z0-9]+(?:-[a-z0-9]+)*-[a-zA-Z0-9._-]+|[a-zA-Z0-9._-]+)'
const OBJ_ID = '[^/]+'

export const ZED_CAFE_EXPORT_ALLOWED_PATH: RegExp[] = [
  /^stats\.json$/,
  new RegExp(`^${DIR_SEG}/stats\\.json$`),
  new RegExp(`^${DIR_SEG}/flags/${OBJ_ID}\\.json$`),
  new RegExp(`^${DIR_SEG}/${DIR_SEG}/stats\\.json$`),
  new RegExp(`^${DIR_SEG}/${DIR_SEG}/board/stats\\.json$`),
  new RegExp(`^${DIR_SEG}/${DIR_SEG}/board/terrain/[0-9]+\\.json$`),
  new RegExp(`^${DIR_SEG}/${DIR_SEG}/board/objects/${OBJ_ID}\\.json$`),
  new RegExp(`^${DIR_SEG}/${DIR_SEG}/object/element\\.json$`),
  new RegExp(`^${DIR_SEG}/${DIR_SEG}/terrain/element\\.json$`),
  new RegExp(`^${DIR_SEG}/${DIR_SEG}/charset/bitmap\\.json$`),
  new RegExp(`^${DIR_SEG}/${DIR_SEG}/palette/bitmap\\.json$`),
]

export type ZED_CAFE_EXPORT_VALIDATION = {
  ok: boolean
  errors: string[]
}

const decoder = new TextDecoder()

function decodejson(bytes: Uint8Array): unknown {
  return JSON.parse(decoder.decode(bytes))
}

export function kebabcasezedcafenameportion(name: string | undefined): string {
  const kebab = (name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!kebab) {
    return ''
  }
  const capped = kebab.slice(0, ZEDCAFE_DIRNAME_NAME_MAX_LEN)
  return capped.replace(/-+$/, '')
}

export function kebabcasezedcafedirname(
  name: string | undefined,
  id: string,
): string {
  const portion = kebabcasezedcafenameportion(name)
  if (!portion) {
    return id
  }
  return `${portion}-${id}`
}

export function readzedcafebookdirname(book: BOOK): string {
  return kebabcasezedcafedirname(book.name, book.id)
}

export function readzedcafebookprefix(book: BOOK): string {
  return readzedcafebookdirname(book)
}

export function readzedcafepagedirname(page: CODE_PAGE): string {
  return kebabcasezedcafedirname(memoryreadcodepagename(page), page.id)
}

export function readzedcafepageprefix(book: BOOK, page: CODE_PAGE): string {
  return `${readzedcafebookprefix(book)}/${readzedcafepagedirname(page)}`
}

export function readzedcafebookstatspath(book: BOOK): string {
  return `${readzedcafebookprefix(book)}/stats.json`
}

export function isallowedexportpath(path: string): boolean {
  if (!path || path.includes('..') || path.startsWith('/')) {
    return false
  }
  for (let i = 0; i < ZED_CAFE_EXPORT_ALLOWED_PATH.length; ++i) {
    if (ZED_CAFE_EXPORT_ALLOWED_PATH[i].test(path)) {
      return true
    }
  }
  return false
}

function readpathindex(
  files: ZED_CAFE_EXPORT_PATH_FILE[],
): Map<string, Uint8Array> {
  const index = new Map<string, Uint8Array>()
  for (let i = 0; i < files.length; ++i) {
    const file = files[i]
    index.set(file.path, file.bytes)
  }
  return index
}

function validatestructure(
  files: ZED_CAFE_EXPORT_PATH_FILE[],
  errors: string[],
) {
  const index = readpathindex(files)
  const rootbytes = index.get('stats.json')
  if (!rootbytes) {
    errors.push('missing root stats.json')
    return
  }
  let rootstats: {
    books?: { id: string; name?: string }[]
  }
  try {
    rootstats = decodejson(rootbytes) as {
      books?: { id: string; name?: string }[]
    }
  } catch {
    errors.push('root stats.json is not valid JSON')
    return
  }
  const bookrefs = rootstats.books ?? []
  for (let i = 0; i < bookrefs.length; ++i) {
    const bookref = bookrefs[i]
    const bookdirname = kebabcasezedcafedirname(bookref.name, bookref.id)
    const bookpath = `${bookdirname}/stats.json`
    const bookbytes = index.get(bookpath)
    if (!bookbytes) {
      errors.push(`missing book stats for ${bookref.id}: ${bookpath}`)
      continue
    }
    let bookmeta: {
      pages?: { id: string; name?: string }[]
      flags?: unknown
      timestamp?: unknown
    }
    try {
      bookmeta = decodejson(bookbytes) as {
        pages?: { id: string; name?: string }[]
        flags?: unknown
        timestamp?: unknown
      }
    } catch {
      errors.push(`book stats.json is not valid JSON: ${bookpath}`)
      continue
    }
    if ('flags' in bookmeta) {
      errors.push(`book stats.json must not embed flags: ${bookpath}`)
    }
    if ('timestamp' in bookmeta) {
      errors.push(`book stats.json must not include timestamp: ${bookpath}`)
    }
    const pagerefs = bookmeta.pages ?? []
    for (let j = 0; j < pagerefs.length; ++j) {
      const pageref = pagerefs[j]
      const pageprefix = `${bookdirname}/${kebabcasezedcafedirname(pageref.name, pageref.id)}`
      const pagepath = `${pageprefix}/stats.json`
      if (!index.has(pagepath)) {
        errors.push(`missing page stats for ${pageref.id}: ${pagepath}`)
      }
      const legacyterrain = `${pageprefix}/board/terrain.json`
      if (index.has(legacyterrain)) {
        errors.push(`legacy board/terrain.json is not allowed: ${legacyterrain}`)
      }
      const terrainprefix = `${pageprefix}/board/terrain/`
      let terraincount = 0
      for (const path of index.keys()) {
        if (path.startsWith(terrainprefix) && path.endsWith('.json')) {
          terraincount += 1
        }
      }
      if (terraincount === 0) {
        continue
      }
      if (terraincount !== BOARD_SIZE) {
        errors.push(
          `board terrain cell count ${terraincount} != ${BOARD_SIZE} under ${terrainprefix}`,
        )
      }
      for (let cell = 0; cell < BOARD_SIZE; ++cell) {
        const cellpath = `${terrainprefix}${cell}.json`
        if (!index.has(cellpath)) {
          errors.push(`missing terrain cell: ${cellpath}`)
          break
        }
      }
    }
  }
}

export type ValidateZedCafeExportOptions = {
  /** Upsert subset — allowlisted paths only; skip full-tree structure checks. */
  partial?: boolean
}

export function validatezedcafeexportpaths(
  files: ZED_CAFE_EXPORT_PATH_FILE[],
  options?: ValidateZedCafeExportOptions,
): ZED_CAFE_EXPORT_VALIDATION {
  const errors: string[] = []
  const seen = new Set<string>()
  for (let i = 0; i < files.length; ++i) {
    const path = files[i].path
    if (seen.has(path)) {
      errors.push(`duplicate path: ${path}`)
      continue
    }
    seen.add(path)
    if (!isallowedexportpath(path)) {
      errors.push(`path outside schema: ${path}`)
    }
  }
  if (!options?.partial) {
    validatestructure(files, errors)
  }
  return { ok: errors.length === 0, errors }
}

export function assertzedcafeexportvalid(files: ZED_CAFE_EXPORT_PATH_FILE[]) {
  const result = validatezedcafeexportpaths(files)
  if (!result.ok) {
    throw new Error(`zedcafe export schema: ${result.errors.join('; ')}`)
  }
}
