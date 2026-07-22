import type { WANIX_ZED_CAFE_EXPORT_FILE } from 'zss/feature/wanix/wanixstateexport'
import { issimonlyflagowner } from 'zss/feature/wanix/zedcafeprotectedflags'
import {
  kebabcasezedcafedirname,
  readzedcafebookdirname,
  readzedcafepageprefix,
} from 'zss/feature/wanix/zedcafetreeschema'
import { deepcopy, isequal, ispresent } from 'zss/mapping/types'
import {
  memorycreateboardobject,
  memorydeleteboardobject,
} from 'zss/memory/boardlifecycle'
import {
  memoryclearbookcodepage,
  memoryclearbookflags,
  memoryimportbookfromjson,
  memoryreadbookflags,
  memoryreadcodepage,
  memoryupsertcodepage,
} from 'zss/memory/bookoperations'
import { memoryboundarydelete } from 'zss/memory/boundaries'
import {
  memoryreadcodepagedata,
  memoryreadcodepageruntime,
} from 'zss/memory/codepageoperations'
import { memoryreadboardruntime } from 'zss/memory/runtimeboundary'
import {
  memoryclearbook,
  memoryreadbooklist,
  memorywritebook,
} from 'zss/memory/session'
import { BOARD_SIZE, CODE_PAGE_TYPE } from 'zss/memory/types'
import type { BOARD, BOARD_ELEMENT, BOOK, CODE_PAGE } from 'zss/memory/types'

export type WANIX_ZED_CAFE_PARSED_PAGE = {
  id: string
  code: string
  board?: Record<string, unknown>
  object?: Record<string, unknown>
  terrain?: Record<string, unknown>
  charset?: Record<string, unknown>
  palette?: Record<string, unknown>
}

export type WANIX_ZED_CAFE_PARSED_BOOK = {
  id: string
  name: string
  token: string
  timestamp: number
  activelist: string[]
  flags: Record<string, unknown>
  pages: WANIX_ZED_CAFE_PARSED_PAGE[]
}

export type WANIX_ZED_CAFE_PARSED = {
  exportedAt?: string
  guestTouch?: boolean
  books: WANIX_ZED_CAFE_PARSED_BOOK[]
}

export type APPLY_ZEDCAFE_PARTIAL_RESULT = {
  changed: boolean
  paintids: string[]
  bookcount: number
  changedpaths: string[]
  skippedpaths: string[]
}

const decoder = new TextDecoder()

/** Sim-owned flag bags — never import-delete or overwrite (mirrors boundaryrouting). */
export function isimportprotectedflagowner(owner: string): boolean {
  return issimonlyflagowner(owner)
}

function decodejson(bytes: Uint8Array): unknown {
  return JSON.parse(decoder.decode(bytes))
}

function buildindex(
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
): Map<string, Uint8Array> {
  const index = new Map<string, Uint8Array>()
  for (let i = 0; i < files.length; ++i) {
    const file = files[i]
    index.set(file.path, file.bytes)
  }
  return index
}

function parsejsonfile(
  index: Map<string, Uint8Array>,
  path: string,
): unknown | undefined {
  const bytes = index.get(path)
  if (!bytes) {
    return undefined
  }
  return decodejson(bytes)
}

function readbookflagsfromindex(
  index: Map<string, Uint8Array>,
  bookdirname: string,
): Record<string, unknown> {
  const flags: Record<string, unknown> = {}
  const prefix = `${bookdirname}/flags/`
  for (const [path, bytes] of index) {
    if (!path.startsWith(prefix) || !path.endsWith('.json')) {
      continue
    }
    const owner = path.slice(prefix.length, -'.json'.length)
    if (!owner || owner.includes('/')) {
      continue
    }
    flags[owner] = decodejson(bytes)
  }
  return flags
}

function assembleterrain(
  index: Map<string, Uint8Array>,
  prefix: string,
): unknown[] | undefined {
  const terrainprefix = `${prefix}/board/terrain/`
  for (const path of index.keys()) {
    if (path.startsWith(terrainprefix) && path.endsWith('.json')) {
      throw new Error(
        `per-cell board/terrain/<index>.json is not allowed (wipe/re-seed remotes): ${path}`,
      )
    }
  }
  const terrainpath = `${prefix}/board/terrain.json`
  const bytes = index.get(terrainpath)
  if (!bytes) {
    return undefined
  }
  const terrain = decodejson(bytes)
  if (!Array.isArray(terrain)) {
    throw new Error(`board terrain must be an array: ${terrainpath}`)
  }
  if (terrain.length !== BOARD_SIZE) {
    throw new Error(
      `board terrain length ${terrain.length} != ${BOARD_SIZE}: ${terrainpath}`,
    )
  }
  return terrain
}

export function assembleboardjson(
  index: Map<string, Uint8Array>,
  prefix: string,
): Record<string, unknown> | undefined {
  const statspath = `${prefix}/board/stats.json`
  const objectprefix = `${prefix}/board/objects/`
  const statsbytes = index.get(statspath)
  const terrain = assembleterrain(index, prefix)
  const objects: Record<string, unknown> = {}
  for (const [path, bytes] of index) {
    if (!path.startsWith(objectprefix) || !path.endsWith('.json')) {
      continue
    }
    const objid = path.slice(objectprefix.length, -'.json'.length)
    objects[objid] = decodejson(bytes)
  }
  if (
    !statsbytes &&
    terrain === undefined &&
    Object.keys(objects).length === 0
  ) {
    return undefined
  }
  const board: Record<string, unknown> = {}
  if (statsbytes) {
    Object.assign(board, decodejson(statsbytes))
  }
  if (terrain !== undefined) {
    board.terrain = terrain
  }
  // Always set objects — omitting it leaves board.objects undefined after upsert
  // and crashes movement (memoryreadobject → objects['404']).
  board.objects = objects
  return board
}

export function assemblecodepagejson(
  index: Map<string, Uint8Array>,
  pageprefix: string,
): WANIX_ZED_CAFE_PARSED_PAGE | undefined {
  const prefix = pageprefix
  const stats = parsejsonfile(index, `${prefix}/stats.json`) as
    | {
        id?: string
        code?: string
      }
    | undefined
  if (!ispresent(stats)) {
    return undefined
  }
  const pageid = stats.id ?? prefix.split('/').pop() ?? ''
  const wire: WANIX_ZED_CAFE_PARSED_PAGE = {
    id: pageid,
    code: stats.code ?? '',
  }
  const board = assembleboardjson(index, prefix)
  if (board) {
    wire.board = board
  }
  const object = parsejsonfile(index, `${prefix}/object/element.json`)
  if (object) {
    wire.object = object as Record<string, unknown>
  }
  const terrain = parsejsonfile(index, `${prefix}/terrain/element.json`)
  if (terrain) {
    wire.terrain = terrain as Record<string, unknown>
  }
  const charset = parsejsonfile(index, `${prefix}/charset/bitmap.json`)
  if (charset) {
    wire.charset = charset as Record<string, unknown>
  }
  const palette = parsejsonfile(index, `${prefix}/palette/bitmap.json`)
  if (palette) {
    wire.palette = palette as Record<string, unknown>
  }
  return wire
}

export function parsezedcafeexportfiles(
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
): WANIX_ZED_CAFE_PARSED {
  const index = buildindex(files)
  const rootstats = parsejsonfile(index, 'stats.json') as
    | {
        exportedAt?: string
        guestTouch?: boolean
        books?: { id: string; name?: string }[]
      }
    | undefined
  const books: WANIX_ZED_CAFE_PARSED_BOOK[] = []
  const bookrefs = rootstats?.books ?? []
  for (let i = 0; i < bookrefs.length; ++i) {
    const bookref = bookrefs[i]
    const bookid = bookref.id
    const bookdirname = kebabcasezedcafedirname(bookref.name, bookid)
    const bookmeta = parsejsonfile(index, `${bookdirname}/stats.json`) as
      | {
          id?: string
          name?: string
          token?: string
          flags?: unknown
          timestamp?: unknown
          activelist?: string[]
          pages?: { id: string; name?: string }[]
        }
      | undefined
    if (!ispresent(bookmeta)) {
      continue
    }
    if ('flags' in bookmeta) {
      throw new Error(
        `book stats.json must not embed flags: ${bookdirname}/stats.json`,
      )
    }
    if ('timestamp' in bookmeta) {
      throw new Error(
        `book stats.json must not include timestamp: ${bookdirname}/stats.json`,
      )
    }
    const pages: WANIX_ZED_CAFE_PARSED_PAGE[] = []
    const pagerefs = bookmeta.pages ?? []
    for (let j = 0; j < pagerefs.length; ++j) {
      const pageref = pagerefs[j]
      const pageid = pageref.id
      const pagedirname = kebabcasezedcafedirname(pageref.name, pageid)
      const pageprefix = `${bookdirname}/${pagedirname}`
      const page = assemblecodepagejson(index, pageprefix)
      if (page) {
        pages.push(page)
      }
    }
    books.push({
      id: bookmeta.id ?? bookid,
      name: bookmeta.name ?? bookid,
      token: bookmeta.token ?? '',
      timestamp: 0,
      activelist: bookmeta.activelist ?? [],
      flags: readbookflagsfromindex(index, bookdirname),
      pages,
    })
  }
  return {
    exportedAt: rootstats?.exportedAt,
    guestTouch: rootstats?.guestTouch,
    books,
  }
}

function readbookbyid(bookid: string): BOOK | undefined {
  const books = memoryreadbooklist()
  for (let i = 0; i < books.length; ++i) {
    if (books[i].id === bookid) {
      return books[i]
    }
  }
  return undefined
}

function findbookbydirname(bookdirname: string): BOOK | undefined {
  const books = memoryreadbooklist()
  for (let i = 0; i < books.length; ++i) {
    if (readzedcafebookdirname(books[i]) === bookdirname) {
      return books[i]
    }
  }
  return undefined
}

function findpageinbook(book: BOOK, pageprefix: string): CODE_PAGE | undefined {
  for (let i = 0; i < book.pages.length; ++i) {
    if (readzedcafepageprefix(book, book.pages[i]) === pageprefix) {
      return book.pages[i]
    }
  }
  return undefined
}

function readpagedirsegment(pageprefix: string): string {
  const slash = pageprefix.indexOf('/')
  if (slash < 0) {
    return pageprefix
  }
  return pageprefix.slice(slash + 1)
}

function stubcodefrompagedir(pagedir: string): { id: string; code: string } {
  const marker = '-sid_'
  const idx = pagedir.lastIndexOf(marker)
  if (idx >= 0) {
    const name = pagedir.slice(0, idx)
    const id = pagedir.slice(idx + 1)
    return { id, code: `@board ${name}\n` }
  }
  return { id: pagedir, code: `@board ${pagedir}\n` }
}

function ensurepageinbook(
  book: BOOK,
  pageprefix: string,
  paintids: Set<string>,
  code?: string,
): CODE_PAGE | undefined {
  const existing = findpageinbook(book, pageprefix)
  if (existing) {
    return existing
  }
  const stub = stubcodefrompagedir(readpagedirsegment(pageprefix))
  const flat = { id: stub.id, code: code ?? stub.code }
  if (!memoryupsertcodepage(book, flat)) {
    return undefined
  }
  const created = memoryreadcodepage(book, flat.id)
  if (created) {
    markboardpaint(paintids, created)
  }
  return created
}

function mergebookpagesfrommeta(
  book: BOOK,
  bookdirname: string,
  pages: { id: string; name?: string }[] | undefined,
  paintids: Set<string>,
): boolean {
  if (!Array.isArray(pages) || pages.length === 0) {
    return false
  }
  let changed = false
  for (let i = 0; i < pages.length; ++i) {
    const ref = pages[i]
    const pagedir = kebabcasezedcafedirname(ref.name, ref.id)
    const pageprefix = `${bookdirname}/${pagedir}`
    if (findpageinbook(book, pageprefix)) {
      continue
    }
    const name = ref.name ?? ref.id
    if (
      ensurepageinbook(book, pageprefix, paintids, `@board ${name}\n`) !==
      undefined
    ) {
      changed = true
    }
  }
  return changed
}

function applybookmeta(book: BOOK, flat: WANIX_ZED_CAFE_PARSED_BOOK) {
  book.name = flat.name
  book.token = flat.token
  book.activelist = flat.activelist
}

function applyoneflagowner(
  book: BOOK,
  owner: string,
  incoming: unknown,
): boolean {
  if (isimportprotectedflagowner(owner)) {
    return false
  }
  const current = memoryreadbookflags(book, owner)
  if (isequal(current, incoming)) {
    return false
  }
  memoryclearbookflags(book, owner)
  Object.assign(memoryreadbookflags(book, owner), incoming as object)
  return true
}

function applybookflags(
  book: BOOK,
  flatflags: Record<string, unknown>,
): boolean {
  let changed = false
  const keep = new Set(Object.keys(flatflags))
  const existing = Object.keys(book.flags ?? {})
  for (let i = 0; i < existing.length; ++i) {
    const id = existing[i]
    if (keep.has(id) || isimportprotectedflagowner(id)) {
      continue
    }
    const bid = book.flags[id]
    memoryboundarydelete(bid)
    delete book.flags[id]
    changed = true
  }
  const owners = Object.keys(flatflags)
  for (let i = 0; i < owners.length; ++i) {
    const id = owners[i]
    if (applyoneflagowner(book, id, flatflags[id])) {
      changed = true
    }
  }
  return changed
}

function readboardforpage(page: CODE_PAGE): BOARD | undefined {
  return memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(page)
}

function markboardpaint(paintids: Set<string>, page: CODE_PAGE) {
  paintids.add(page.id)
}

function applyterraininplace(
  page: CODE_PAGE,
  terrain: unknown[],
  path: string,
): boolean {
  if (terrain.length !== BOARD_SIZE) {
    throw new Error(
      `board terrain length ${terrain.length} != ${BOARD_SIZE}: ${path}`,
    )
  }
  const board = readboardforpage(page)
  if (!ispresent(board)) {
    return false
  }
  board.terrain = terrain as BOARD['terrain']
  const boardruntime = memoryreadboardruntime(board)
  if (ispresent(boardruntime)) {
    delete boardruntime.distmaps
  }
  return true
}

function applyobjectinplace(
  page: CODE_PAGE,
  objid: string,
  data: Record<string, unknown>,
): boolean {
  const board = readboardforpage(page)
  if (!ispresent(board)) {
    return false
  }
  if (!board.objects || typeof board.objects !== 'object') {
    board.objects = {}
  }
  const existing = board.objects[objid]
  if (ispresent(existing)) {
    memorydeleteboardobject(board, objid)
  }
  const created = memorycreateboardobject(board, {
    ...(data as BOARD_ELEMENT),
    id: objid,
  })
  return ispresent(created)
}

function applyboardstatsinplace(
  page: CODE_PAGE,
  stats: Record<string, unknown>,
): boolean {
  const board = readboardforpage(page)
  if (!ispresent(board)) {
    return false
  }
  const rest = { ...stats }
  delete rest.terrain
  delete rest.objects
  delete rest.id
  let changed = false
  const keys = Object.keys(rest)
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i]
    const next = rest[key]
    if (!isequal((board as Record<string, unknown>)[key], next)) {
      ;(board as Record<string, unknown>)[key] = next
      changed = true
    }
  }
  return changed
}

function applypageelementfield(
  page: CODE_PAGE,
  field: 'object' | 'terrain' | 'charset' | 'palette',
  value: unknown,
): boolean {
  const rt = memoryreadcodepageruntime(page)
  if (!ispresent(rt)) {
    return false
  }
  if (isequal(rt[field], value)) {
    return false
  }
  ;(rt as Record<string, unknown>)[field] = deepcopy(value)
  return true
}

function pathpriority(path: string): number {
  if (path === 'stats.json') {
    return 0
  }
  const segments = path.split('/')
  if (segments.length === 2 && segments[1] === 'stats.json') {
    return 1
  }
  if (segments.length === 3 && segments[1] === 'flags') {
    return 2
  }
  if (segments.length === 3 && segments[2] === 'stats.json') {
    return 3
  }
  if (
    segments.length === 4 &&
    segments[2] === 'board' &&
    segments[3] === 'stats.json'
  ) {
    return 4
  }
  if (
    segments.length === 4 &&
    segments[2] === 'board' &&
    segments[3] === 'terrain.json'
  ) {
    return 5
  }
  if (
    segments.length === 5 &&
    segments[2] === 'board' &&
    segments[3] === 'objects'
  ) {
    return 6
  }
  return 7
}

function applypartialupsertpath(
  path: string,
  bytes: Uint8Array,
  paintids: Set<string>,
): boolean {
  if (path === 'stats.json') {
    return false
  }
  const segments = path.split('/')
  if (segments.length < 2) {
    return false
  }
  const bookdirname = segments[0]
  const book = findbookbydirname(bookdirname)
  if (!book) {
    throw new Error(`zedcafe partial import: unknown book dir ${bookdirname}`)
  }
  if (segments.length === 2 && segments[1] === 'stats.json') {
    const meta = decodejson(bytes) as {
      name?: string
      token?: string
      activelist?: string[]
      pages?: { id: string; name?: string }[]
      flags?: unknown
      timestamp?: unknown
    }
    if ('flags' in meta) {
      throw new Error(`book stats.json must not embed flags: ${path}`)
    }
    if ('timestamp' in meta) {
      throw new Error(`book stats.json must not include timestamp: ${path}`)
    }
    let changed = false
    if (typeof meta.name === 'string' && book.name !== meta.name) {
      book.name = meta.name
      changed = true
    }
    if (typeof meta.token === 'string' && book.token !== meta.token) {
      book.token = meta.token
      changed = true
    }
    if (
      Array.isArray(meta.activelist) &&
      !isequal(book.activelist, meta.activelist)
    ) {
      book.activelist = meta.activelist
      changed = true
    }
    if (mergebookpagesfrommeta(book, bookdirname, meta.pages, paintids)) {
      changed = true
    }
    return changed
  }
  if (segments.length === 3 && segments[1] === 'flags') {
    const owner = segments[2].replace(/\.json$/, '')
    return applyoneflagowner(book, owner, decodejson(bytes))
  }
  if (segments.length < 3) {
    return false
  }
  const pageprefix = `${segments[0]}/${segments[1]}`
  let page = findpageinbook(book, pageprefix)
  if (segments.length === 3 && segments[2] === 'stats.json') {
    const stats = decodejson(bytes) as { id?: string; code?: string }
    const pageid = stats.id ?? segments[1]
    const flat = { id: pageid, code: stats.code ?? '' }
    if (!page) {
      if (memoryupsertcodepage(book, flat)) {
        const created = memoryreadcodepage(book, pageid)
        if (created) {
          markboardpaint(paintids, created)
        }
        return true
      }
      return false
    }
    if (page.code === flat.code) {
      return false
    }
    page.code = flat.code
    markboardpaint(paintids, page)
    return true
  }
  page ??= ensurepageinbook(book, pageprefix, paintids)
  if (!page) {
    return false
  }
  if (
    segments.length === 4 &&
    segments[2] === 'board' &&
    segments[3] === 'terrain.json'
  ) {
    const terrain = decodejson(bytes)
    if (!Array.isArray(terrain)) {
      throw new Error(`board terrain must be an array: ${path}`)
    }
    if (applyterraininplace(page, terrain, path)) {
      markboardpaint(paintids, page)
      return true
    }
    // Fall back to page upsert with terrain only merge of existing board
    const board = readboardforpage(page)
    const flatboard: Record<string, unknown> = {
      terrain,
      objects: board?.objects ?? {},
    }
    if (board) {
      const stats: Record<string, unknown> = {
        ...(board as unknown as Record<string, unknown>),
      }
      delete stats.terrain
      delete stats.objects
      Object.assign(flatboard, stats)
    }
    if (
      memoryupsertcodepage(book, {
        id: page.id,
        code: page.code,
        board: flatboard,
      })
    ) {
      markboardpaint(paintids, page)
      return true
    }
    return false
  }
  if (
    segments.length === 4 &&
    segments[2] === 'board' &&
    segments[3] === 'stats.json'
  ) {
    const stats = decodejson(bytes) as Record<string, unknown>
    if (applyboardstatsinplace(page, stats)) {
      markboardpaint(paintids, page)
      return true
    }
    return false
  }
  if (
    segments.length === 5 &&
    segments[2] === 'board' &&
    segments[3] === 'objects'
  ) {
    const objid = segments[4].replace(/\.json$/, '')
    const data = decodejson(bytes) as Record<string, unknown>
    if (applyobjectinplace(page, objid, data)) {
      markboardpaint(paintids, page)
      return true
    }
    return false
  }
  if (
    segments.length === 4 &&
    segments[2] === 'object' &&
    segments[3] === 'element.json'
  ) {
    if (applypageelementfield(page, 'object', decodejson(bytes))) {
      markboardpaint(paintids, page)
      return true
    }
    return false
  }
  if (
    segments.length === 4 &&
    segments[2] === 'terrain' &&
    segments[3] === 'element.json'
  ) {
    if (applypageelementfield(page, 'terrain', decodejson(bytes))) {
      markboardpaint(paintids, page)
      return true
    }
    return false
  }
  if (
    segments.length === 4 &&
    segments[2] === 'charset' &&
    segments[3] === 'bitmap.json'
  ) {
    if (applypageelementfield(page, 'charset', decodejson(bytes))) {
      markboardpaint(paintids, page)
      return true
    }
    return false
  }
  if (
    segments.length === 4 &&
    segments[2] === 'palette' &&
    segments[3] === 'bitmap.json'
  ) {
    if (applypageelementfield(page, 'palette', decodejson(bytes))) {
      markboardpaint(paintids, page)
      return true
    }
    return false
  }
  return false
}

function applypartialremovepath(path: string, paintids: Set<string>): boolean {
  if (path === 'stats.json') {
    return false
  }
  const segments = path.split('/')
  if (segments.length < 2) {
    return false
  }
  const bookdirname = segments[0]
  const book = findbookbydirname(bookdirname)
  if (!book) {
    return false
  }
  if (segments.length === 2 && segments[1] === 'stats.json') {
    memoryclearbook(book.id)
    return true
  }
  if (segments.length === 3 && segments[1] === 'flags') {
    const owner = segments[2].replace(/\.json$/, '')
    if (isimportprotectedflagowner(owner)) {
      return false
    }
    if (!(owner in (book.flags ?? {}))) {
      return false
    }
    const bid = book.flags[owner]
    memoryboundarydelete(bid)
    delete book.flags[owner]
    return true
  }
  if (segments.length < 3) {
    return false
  }
  const pageprefix = `${segments[0]}/${segments[1]}`
  const page = findpageinbook(book, pageprefix)
  if (!page) {
    return false
  }
  if (segments.length === 3 && segments[2] === 'stats.json') {
    if (memoryclearbookcodepage(book, page.id)) {
      return true
    }
    return false
  }
  if (
    segments.length === 5 &&
    segments[2] === 'board' &&
    segments[3] === 'objects'
  ) {
    const objid = segments[4].replace(/\.json$/, '')
    const board = readboardforpage(page)
    if (!ispresent(board)) {
      return false
    }
    if (memorydeleteboardobject(board, objid)) {
      markboardpaint(paintids, page)
      return true
    }
    return false
  }
  return false
}

/** Path-scoped apply: only listed upserts/removes; never sparse-tree deletes. */
export function applyzedcafepartialtomemory(
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
  removepaths: string[] = [],
): APPLY_ZEDCAFE_PARTIAL_RESULT {
  let changed = false
  const paintids = new Set<string>()
  const changedpaths: string[] = []
  const skippedpaths: string[] = []
  const sortedfiles = [...files].sort(
    (a, b) =>
      pathpriority(a.path) - pathpriority(b.path) ||
      a.path.localeCompare(b.path),
  )
  for (let i = 0; i < sortedfiles.length; ++i) {
    const file = sortedfiles[i]
    if (applypartialupsertpath(file.path, file.bytes, paintids)) {
      changed = true
      changedpaths.push(file.path)
    } else {
      skippedpaths.push(file.path)
    }
  }
  const sortedremoves = [...removepaths].sort(
    (a, b) => pathpriority(b) - pathpriority(a) || a.localeCompare(b),
  )
  for (let i = 0; i < sortedremoves.length; ++i) {
    const path = sortedremoves[i]
    if (applypartialremovepath(path, paintids)) {
      changed = true
      changedpaths.push(path)
    } else {
      skippedpaths.push(path)
    }
  }
  return {
    changed,
    paintids: [...paintids],
    bookcount: memoryreadbooklist().length,
    changedpaths,
    skippedpaths,
  }
}

export function applyzedcafetomemory(parsed: WANIX_ZED_CAFE_PARSED): boolean {
  let changed = false
  const keepbookids = new Set<string>()
  for (let i = 0; i < parsed.books.length; ++i) {
    keepbookids.add(parsed.books[i].id)
  }

  for (let i = 0; i < parsed.books.length; ++i) {
    const flat = parsed.books[i]
    let book = readbookbyid(flat.id)
    if (!book) {
      const imported = memoryimportbookfromjson(flat)
      if (imported) {
        memorywritebook(imported)
        changed = true
      }
      continue
    }
    applybookmeta(book, flat)
    if (applybookflags(book, flat.flags)) {
      changed = true
    }
    for (let j = 0; j < flat.pages.length; ++j) {
      if (memoryupsertcodepage(book, flat.pages[j])) {
        changed = true
      }
    }
    const keeppageids = new Set<string>()
    for (let j = 0; j < flat.pages.length; ++j) {
      keeppageids.add(flat.pages[j].id)
    }
    book = readbookbyid(flat.id)
    if (!book) {
      continue
    }
    const pageids: string[] = []
    for (let j = 0; j < book.pages.length; ++j) {
      pageids.push(book.pages[j].id)
    }
    for (let j = 0; j < pageids.length; ++j) {
      const pageid = pageids[j]
      if (keeppageids.has(pageid)) {
        continue
      }
      if (memoryclearbookcodepage(book, pageid)) {
        changed = true
      }
    }
  }

  const simbooks = memoryreadbooklist()
  for (let i = 0; i < simbooks.length; ++i) {
    const book = simbooks[i]
    if (keepbookids.has(book.id)) {
      continue
    }
    memoryclearbook(book.id)
    changed = true
  }

  if (parsed.guestTouch) {
    changed = true
  }
  return changed
}
