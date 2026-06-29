import { memoryreadcodepagename } from 'zss/memory/codepageoperations'
import type { BOOK, CODE_PAGE } from 'zss/memory/types'

export type ZED_CAFE_EXPORT_PATH_FILE = {
  path: string
  bytes: Uint8Array
}

const ZED_CAFE_DIRNAME_NAME_MAX_LEN = 48

const DIR_SEG =
  '(?:[a-z0-9]+(?:-[a-z0-9]+)*-[a-zA-Z0-9._-]+|[a-zA-Z0-9._-]+)'
const OBJ_ID = '[^/]+'

export const ZED_CAFE_EXPORT_ALLOWED_PATH: RegExp[] = [
  /^stats\.json$/,
  new RegExp(`^books/${DIR_SEG}/stats\\.json$`),
  new RegExp(`^books/${DIR_SEG}/pages/${DIR_SEG}/stats\\.json$`),
  new RegExp(`^books/${DIR_SEG}/pages/${DIR_SEG}/board/stats\\.json$`),
  new RegExp(`^books/${DIR_SEG}/pages/${DIR_SEG}/board/terrain\\.json$`),
  new RegExp(
    `^books/${DIR_SEG}/pages/${DIR_SEG}/board/objects/${OBJ_ID}\\.json$`,
  ),
  new RegExp(`^books/${DIR_SEG}/pages/${DIR_SEG}/object/element\\.json$`),
  new RegExp(`^books/${DIR_SEG}/pages/${DIR_SEG}/terrain/element\\.json$`),
  new RegExp(`^books/${DIR_SEG}/pages/${DIR_SEG}/charset/bitmap\\.json$`),
  new RegExp(`^books/${DIR_SEG}/pages/${DIR_SEG}/palette/bitmap\\.json$`),
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
  const capped = kebab.slice(0, ZED_CAFE_DIRNAME_NAME_MAX_LEN)
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
  return `books/${readzedcafebookdirname(book)}`
}

export function readzedcafepagedirname(page: CODE_PAGE): string {
  return kebabcasezedcafedirname(memoryreadcodepagename(page), page.id)
}

export function readzedcafepageprefix(book: BOOK, page: CODE_PAGE): string {
  return `${readzedcafebookprefix(book)}/pages/${readzedcafepagedirname(page)}`
}

export function readzedcafebookstatspath(book: BOOK): string {
  return `${readzedcafebookprefix(book)}/stats.json`
}

export function readzedcafepagestatspath(book: BOOK, page: CODE_PAGE): string {
  return `${readzedcafepageprefix(book, page)}/stats.json`
}

function isallowedexportpath(path: string): boolean {
  if (!path || path.includes('..') || path.startsWith('/')) {
    return false
  }
  for (let i = 0; i < ZED_CAFE_EXPORT_ALLOWED_PATH.length; ++i) {
    if (ZED_CAFE_EXPORT_ALLOWED_PATH[i]!.test(path)) {
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
    const file = files[i]!
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
    const bookref = bookrefs[i]!
    const bookpath = `books/${kebabcasezedcafedirname(bookref.name, bookref.id)}/stats.json`
    const bookbytes = index.get(bookpath)
    if (!bookbytes) {
      errors.push(`missing book stats for ${bookref.id}: ${bookpath}`)
      continue
    }
    let bookmeta: {
      pages?: { id: string; name?: string }[]
    }
    try {
      bookmeta = decodejson(bookbytes) as {
        pages?: { id: string; name?: string }[]
      }
    } catch {
      errors.push(`book stats.json is not valid JSON: ${bookpath}`)
      continue
    }
    const pagerefs = bookmeta.pages ?? []
    for (let j = 0; j < pagerefs.length; ++j) {
      const pageref = pagerefs[j]!
      const pagepath = `books/${kebabcasezedcafedirname(bookref.name, bookref.id)}/pages/${kebabcasezedcafedirname(pageref.name, pageref.id)}/stats.json`
      if (!index.has(pagepath)) {
        errors.push(`missing page stats for ${pageref.id}: ${pagepath}`)
      }
    }
  }
}

export function validatezedcafeexportpaths(
  files: ZED_CAFE_EXPORT_PATH_FILE[],
): ZED_CAFE_EXPORT_VALIDATION {
  const errors: string[] = []
  const seen = new Set<string>()
  for (let i = 0; i < files.length; ++i) {
    const path = files[i]!.path
    if (seen.has(path)) {
      errors.push(`duplicate path: ${path}`)
      continue
    }
    seen.add(path)
    if (!isallowedexportpath(path)) {
      errors.push(`path outside schema: ${path}`)
    }
  }
  validatestructure(files, errors)
  return { ok: errors.length === 0, errors }
}

export function assertzedcafeexportvalid(files: ZED_CAFE_EXPORT_PATH_FILE[]) {
  const result = validatezedcafeexportpaths(files)
  if (!result.ok) {
    throw new Error(`zed-cafe export schema: ${result.errors.join('; ')}`)
  }
}
