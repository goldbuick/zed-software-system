import { MEMORYFS_DIRNAME_NAME_MAX_LEN } from 'zss/feature/memoryfs/constants'
import { memoryreadcodepagename } from 'zss/memory/codepageoperations'
import type { BOOK, CODE_PAGE } from 'zss/memory/types'

export type MEMORYFS_PATH_FILE = {
  path: string
  bytes: Uint8Array
}

const DIR_SEG = '(?:[a-z0-9]+(?:-[a-z0-9]+)*-[a-zA-Z0-9._-]+|[a-zA-Z0-9._-]+)'
const OBJ_ID = '[^/]+'
const FLAG_OWNER = '[^/]+'

export const MEMORYFS_ALLOWED_PATH: RegExp[] = [
  /^stats\.json$/,
  new RegExp(`^books/${DIR_SEG}/stats\\.json$`),
  new RegExp(`^books/${DIR_SEG}/flags/${FLAG_OWNER}/stats\\.json$`),
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

export type MEMORYFS_VALIDATION = {
  ok: boolean
  errors: string[]
}

const decoder = new TextDecoder()

function decodejson(bytes: Uint8Array): unknown {
  return JSON.parse(decoder.decode(bytes))
}

export function kebabcasememoryfsnameportion(name: string | undefined): string {
  const kebab = (name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!kebab) {
    return ''
  }
  const capped = kebab.slice(0, MEMORYFS_DIRNAME_NAME_MAX_LEN)
  return capped.replace(/-+$/, '')
}

export function kebabcasememoryfsdirname(
  name: string | undefined,
  id: string,
): string {
  const portion = kebabcasememoryfsnameportion(name)
  if (!portion) {
    return id
  }
  return `${portion}-${id}`
}

export function readmemoryfsbookdirname(book: BOOK): string {
  return kebabcasememoryfsdirname(book.name, book.id)
}

export function readmemoryfsbookprefix(book: BOOK): string {
  return `books/${readmemoryfsbookdirname(book)}`
}

export function readmemoryfspagedirname(page: CODE_PAGE): string {
  return kebabcasememoryfsdirname(memoryreadcodepagename(page), page.id)
}

export function readmemoryfspageprefix(book: BOOK, page: CODE_PAGE): string {
  return `${readmemoryfsbookprefix(book)}/pages/${readmemoryfspagedirname(page)}`
}

export function readmemoryfsbookstatspath(book: BOOK): string {
  return `${readmemoryfsbookprefix(book)}/stats.json`
}

export function readmemoryfsflagstatspath(book: BOOK, owner: string): string {
  return `${readmemoryfsbookprefix(book)}/flags/${owner}/stats.json`
}

export function readmemoryfspagestatspath(book: BOOK, page: CODE_PAGE): string {
  return `${readmemoryfspageprefix(book, page)}/stats.json`
}

export function isallowedmemoryfspath(path: string): boolean {
  if (!path || path.includes('..') || path.startsWith('/')) {
    return false
  }
  for (let i = 0; i < MEMORYFS_ALLOWED_PATH.length; ++i) {
    if (MEMORYFS_ALLOWED_PATH[i].test(path)) {
      return true
    }
  }
  return false
}

function readpathindex(
  files: MEMORYFS_PATH_FILE[],
): Map<string, Uint8Array> {
  const index = new Map<string, Uint8Array>()
  for (let i = 0; i < files.length; ++i) {
    const file = files[i]
    index.set(file.path, file.bytes)
  }
  return index
}

function validatestructure(files: MEMORYFS_PATH_FILE[], errors: string[]) {
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
    const bookpath = `books/${kebabcasememoryfsdirname(bookref.name, bookref.id)}/stats.json`
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
      const pageref = pagerefs[j]
      const pagepath = `books/${kebabcasememoryfsdirname(bookref.name, bookref.id)}/pages/${kebabcasememoryfsdirname(pageref.name, pageref.id)}/stats.json`
      if (!index.has(pagepath)) {
        errors.push(`missing page stats for ${pageref.id}: ${pagepath}`)
      }
    }
  }
}

export function validatememoryfsexportpaths(
  files: MEMORYFS_PATH_FILE[],
): MEMORYFS_VALIDATION {
  const errors: string[] = []
  const seen = new Set<string>()
  for (let i = 0; i < files.length; ++i) {
    const path = files[i].path
    if (seen.has(path)) {
      errors.push(`duplicate path: ${path}`)
      continue
    }
    seen.add(path)
    if (!isallowedmemoryfspath(path)) {
      errors.push(`path outside schema: ${path}`)
    }
  }
  validatestructure(files, errors)
  return { ok: errors.length === 0, errors }
}

export function assertmemoryfsexportvalid(files: MEMORYFS_PATH_FILE[]) {
  const result = validatememoryfsexportpaths(files)
  if (!result.ok) {
    throw new Error(`memoryfs export schema: ${result.errors.join('; ')}`)
  }
}

/** Parse book dirname `name-id` or bare `id` into id (last segment after final sid_/pid_ pattern is unreliable — id is trailing after last known prefix). */
export function memoryfsparsebookidfromdirname(dirname: string): string {
  const sid = dirname.match(/sid_[A-Za-z0-9_]+$/)
  if (sid) {
    return sid[0]
  }
  return dirname
}

export function memoryfsparsepageidfromdirname(dirname: string): string {
  return memoryfsparsebookidfromdirname(dirname)
}
