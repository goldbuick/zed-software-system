import { memoryfsshouldmirrorflagowner } from 'zss/feature/memoryfs/flagfilter'
import { memoryfsisreadonlypath } from 'zss/feature/memoryfs/readonly'
import {
  type MEMORYFS_PATH_FILE,
  memoryfsparsebookidfromdirname,
  memoryfsparsepageidfromdirname,
} from 'zss/feature/memoryfs/schema'
import { ispresent } from 'zss/mapping/types'
import { memorydeleteboardobject } from 'zss/memory/boardlifecycle'
import {
  memoryclearbookcodepage,
  memoryclearbookflags,
  memoryreadbookflags,
  memoryreadcodepage,
  memoryupsertcodepage,
  memorywritebookflag,
} from 'zss/memory/bookoperations'
import {
  memoryexportcodepageasjson,
  memoryreadcodepageruntime,
} from 'zss/memory/codepageoperations'
import {
  memoryclearbook,
  memoryreadbookbyaddress,
  memoryreadbooklist,
  memorywritesoftwarebook,
} from 'zss/memory/session'
import type { BOOK } from 'zss/memory/types'
import type { WORD } from 'zss/words/types'

const decoder = new TextDecoder()

export type MEMORYFS_APPLY_RESULT = {
  applied: number
  ignored: number
  errors: string[]
}

function decodejson(bytes: Uint8Array): unknown {
  return JSON.parse(decoder.decode(bytes))
}

function errmessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function pathsegments(path: string): string[] {
  return path.split('/')
}

function findbookbydirname(dirname: string): BOOK | undefined {
  const id = memoryfsparsebookidfromdirname(dirname)
  const byid = memoryreadbookbyaddress(id)
  if (ispresent(byid)) {
    return byid
  }
  const books = memoryreadbooklist()
  for (let i = 0; i < books.length; ++i) {
    const book = books[i]
    if (book.id === dirname || book.name === dirname) {
      return book
    }
  }
  return undefined
}

function findpageidfromdirname(
  book: BOOK,
  dirname: string,
): string | undefined {
  const id = memoryfsparsepageidfromdirname(dirname)
  if (memoryreadcodepage(book, id)) {
    return id
  }
  for (let i = 0; i < book.pages.length; ++i) {
    if (book.pages[i].id === dirname) {
      return book.pages[i].id
    }
  }
  return id
}

function applyrootstats(bytes: Uint8Array, errors: string[]) {
  try {
    const parsed = decodejson(bytes) as {
      software?: { main?: string; temp?: string }
    }
    if (parsed.software?.main) {
      memorywritesoftwarebook('main', parsed.software.main)
    }
    if (parsed.software?.temp) {
      memorywritesoftwarebook('temp', parsed.software.temp)
    }
  } catch (err) {
    errors.push(`root stats.json: ${errmessage(err)}`)
  }
}

function applybookmeta(book: BOOK, bytes: Uint8Array, errors: string[]) {
  try {
    const parsed = decodejson(bytes) as {
      name?: string
      token?: string
      activelist?: string[]
    }
    if (typeof parsed.name === 'string') {
      book.name = parsed.name
    }
    if (typeof parsed.token === 'string') {
      book.token = parsed.token
    }
    if (Array.isArray(parsed.activelist)) {
      book.activelist = parsed.activelist.filter((x) => typeof x === 'string')
    }
  } catch (err) {
    errors.push(`book stats: ${errmessage(err)}`)
  }
}

function applyflagowner(
  book: BOOK,
  owner: string,
  bytes: Uint8Array,
  errors: string[],
) {
  if (!memoryfsshouldmirrorflagowner(owner)) {
    return
  }
  try {
    const parsed = decodejson(bytes) as Record<string, WORD>
    if (!parsed || typeof parsed !== 'object') {
      errors.push(`flags/${owner}: not an object`)
      return
    }
    memoryclearbookflags(book, owner)
    const keys = Object.keys(parsed)
    for (let i = 0; i < keys.length; ++i) {
      const key = keys[i]
      memorywritebookflag(book, owner, key, parsed[key])
    }
  } catch (err) {
    errors.push(`flags/${owner}: ${errmessage(err)}`)
  }
}

type PAGE_FILE_BAG = {
  stats?: unknown
  boardstats?: unknown
  terrain?: unknown
  objects: Record<string, unknown>
  object?: unknown
  terrainel?: unknown
  charset?: unknown
  palette?: unknown
}

function ensurepagebag(
  map: Map<string, PAGE_FILE_BAG>,
  key: string,
): PAGE_FILE_BAG {
  let bag = map.get(key)
  if (!bag) {
    bag = { objects: {} }
    map.set(key, bag)
  }
  return bag
}

function applypagebags(
  book: BOOK,
  bags: Map<string, PAGE_FILE_BAG>,
  errors: string[],
) {
  const keys = [...bags.keys()]
  for (let i = 0; i < keys.length; ++i) {
    const pagekey = keys[i]
    const bag = bags.get(pagekey)
    if (!bag) {
      continue
    }
    const existing = memoryreadcodepage(book, pagekey)
    const stats = bag.stats as { id?: string; code?: string } | undefined
    const pageid =
      typeof stats?.id === 'string' ? stats.id : (existing?.id ?? pagekey)
    const code =
      typeof stats?.code === 'string' ? stats.code : (existing?.code ?? '')
    if (!existing && !stats) {
      continue
    }
    const flat: {
      id: string
      code: string
      board?: Record<string, unknown>
      object?: Record<string, unknown>
      terrain?: Record<string, unknown>
      charset?: Record<string, unknown>
      palette?: Record<string, unknown>
    } = { id: pageid, code }

    const prior = existing
      ? (memoryexportcodepageasjson(existing) as Record<string, unknown>)
      : undefined
    const priorboard =
      prior?.board && typeof prior.board === 'object'
        ? (prior.board as Record<string, unknown>)
        : undefined

    if (
      bag.boardstats ||
      bag.terrain !== undefined ||
      Object.keys(bag.objects).length > 0 ||
      priorboard
    ) {
      const board: Record<string, unknown> = {
        ...(priorboard ?? {}),
        ...(typeof bag.boardstats === 'object' && bag.boardstats
          ? (bag.boardstats as Record<string, unknown>)
          : {}),
      }
      delete board.terrain
      delete board.objects
      if (bag.terrain !== undefined) {
        board.terrain = bag.terrain
      } else if (priorboard?.terrain !== undefined) {
        board.terrain = priorboard.terrain
      }
      const objects: Record<string, unknown> = {}
      if (priorboard?.objects && typeof priorboard.objects === 'object') {
        Object.assign(objects, priorboard.objects as Record<string, unknown>)
      }
      Object.assign(objects, bag.objects)
      board.objects = objects
      flat.board = board
    }

    if (bag.object && typeof bag.object === 'object') {
      flat.object = bag.object as Record<string, unknown>
    } else if (prior?.object && typeof prior.object === 'object') {
      flat.object = prior.object as Record<string, unknown>
    }
    if (bag.terrainel && typeof bag.terrainel === 'object') {
      flat.terrain = bag.terrainel as Record<string, unknown>
    } else if (prior?.terrain && typeof prior.terrain === 'object') {
      flat.terrain = prior.terrain as Record<string, unknown>
    }
    if (bag.charset && typeof bag.charset === 'object') {
      flat.charset = bag.charset as Record<string, unknown>
    } else if (prior?.charset && typeof prior.charset === 'object') {
      flat.charset = prior.charset as Record<string, unknown>
    }
    if (bag.palette && typeof bag.palette === 'object') {
      flat.palette = bag.palette as Record<string, unknown>
    } else if (prior?.palette && typeof prior.palette === 'object') {
      flat.palette = prior.palette as Record<string, unknown>
    }

    if (!memoryupsertcodepage(book, flat)) {
      errors.push(`failed upsert page ${pageid}`)
    }
  }
}

function routewrite(
  path: string,
  bytes: Uint8Array,
  pagebags: Map<string, Map<string, PAGE_FILE_BAG>>,
  errors: string[],
  ignored: { n: number },
) {
  if (memoryfsisreadonlypath(path)) {
    ignored.n += 1
    return
  }
  const parts = pathsegments(path)
  if (path === 'stats.json') {
    applyrootstats(bytes, errors)
    return
  }
  if (parts[0] !== 'books' || parts.length < 3) {
    errors.push(`unhandled path: ${path}`)
    return
  }
  const bookdirname = parts[1]
  const book = findbookbydirname(bookdirname)
  if (!ispresent(book)) {
    errors.push(`unknown book for path: ${path}`)
    return
  }
  if (parts[2] === 'stats.json' && parts.length === 3) {
    applybookmeta(book, bytes, errors)
    return
  }
  if (parts[2] === 'flags' && parts[4] === 'stats.json' && parts.length === 5) {
    applyflagowner(book, parts[3], bytes, errors)
    return
  }
  if (parts[2] === 'pages' && parts.length >= 5) {
    const pagedir = parts[3]
    const pageid = findpageidfromdirname(book, pagedir) ?? pagedir
    let bookbags = pagebags.get(book.id)
    if (!bookbags) {
      bookbags = new Map()
      pagebags.set(book.id, bookbags)
    }
    const bag = ensurepagebag(bookbags, pageid)
    const rest = parts.slice(4).join('/')
    try {
      const parsed = decodejson(bytes)
      if (rest === 'stats.json') {
        bag.stats = parsed
      } else if (rest === 'board/stats.json') {
        bag.boardstats = parsed
      } else if (rest === 'board/terrain.json') {
        bag.terrain = parsed
      } else if (rest.startsWith('board/objects/') && rest.endsWith('.json')) {
        const objid = rest.slice('board/objects/'.length, -'.json'.length)
        if (!memoryfsisreadonlypath(path)) {
          bag.objects[objid] = parsed
        }
      } else if (rest === 'object/element.json') {
        bag.object = parsed
      } else if (rest === 'terrain/element.json') {
        bag.terrainel = parsed
      } else if (rest === 'charset/bitmap.json') {
        bag.charset = parsed
      } else if (rest === 'palette/bitmap.json') {
        bag.palette = parsed
      } else {
        errors.push(`unhandled page path: ${path}`)
      }
    } catch (err) {
      errors.push(`${path}: ${errmessage(err)}`)
    }
    return
  }
  errors.push(`unhandled path: ${path}`)
}

function applydelete(path: string, errors: string[], ignored: { n: number }) {
  if (memoryfsisreadonlypath(path)) {
    ignored.n += 1
    return
  }
  const parts = pathsegments(path)
  if (parts[0] !== 'books' || parts.length < 3) {
    return
  }
  const book = findbookbydirname(parts[1])
  if (!ispresent(book)) {
    errors.push(`delete unknown book: ${path}`)
    return
  }
  if (parts[2] === 'stats.json' && parts.length === 3) {
    memoryclearbook(book.id)
    return
  }
  if (parts[2] === 'flags' && parts.length >= 4) {
    const owner = parts[3]
    if (memoryfsshouldmirrorflagowner(owner)) {
      memoryclearbookflags(book, owner)
    }
    return
  }
  if (parts[2] === 'pages' && parts.length >= 4) {
    const pageid = findpageidfromdirname(book, parts[3])
    if (!pageid) {
      return
    }
    if (parts.length === 5 && parts[4] === 'stats.json') {
      memoryclearbookcodepage(book, pageid)
      return
    }
    const rest = parts.slice(4).join('/')
    if (rest.startsWith('board/objects/') && rest.endsWith('.json')) {
      const objid = rest.slice('board/objects/'.length, -'.json'.length)
      const page = memoryreadcodepage(book, pageid)
      const runtime = memoryreadcodepageruntime(page)
      if (runtime?.board) {
        memorydeleteboardobject(runtime.board, objid)
      }
      return
    }
    if (
      parts.length === 4 ||
      (parts.length === 5 && parts[4] === 'stats.json')
    ) {
      memoryclearbookcodepage(book, pageid)
    }
  }
}

/**
 * Apply disk -> MEMORY ops. Read-only player object paths are ignored.
 * Page writes are batched per book so board pieces reassemble before upsert.
 */
export function memoryfsapplyops(
  writes: MEMORYFS_PATH_FILE[],
  deletes: string[],
): MEMORYFS_APPLY_RESULT {
  const errors: string[] = []
  const ignored = { n: 0 }
  let applied = 0

  for (let i = 0; i < deletes.length; ++i) {
    const before = ignored.n
    applydelete(deletes[i], errors, ignored)
    if (ignored.n === before) {
      applied += 1
    }
  }

  const pagebags = new Map<string, Map<string, PAGE_FILE_BAG>>()
  for (let i = 0; i < writes.length; ++i) {
    const before = ignored.n
    const errbefore = errors.length
    routewrite(writes[i].path, writes[i].bytes, pagebags, errors, ignored)
    if (ignored.n === before && errors.length === errbefore) {
      applied += 1
    }
  }

  const bookids = [...pagebags.keys()]
  for (let i = 0; i < bookids.length; ++i) {
    const book = memoryreadbookbyaddress(bookids[i])
    if (!ispresent(book)) {
      continue
    }
    const bags = pagebags.get(bookids[i])
    if (bags) {
      applypagebags(book, bags, errors)
    }
  }

  return { applied, ignored: ignored.n, errors }
}

/** Replace mirrored flag bag from disk object (test helper surface). */
export function memoryfsreplaceflagowner(
  book: BOOK,
  owner: string,
  flags: Record<string, WORD>,
) {
  if (!memoryfsshouldmirrorflagowner(owner)) {
    return
  }
  memoryclearbookflags(book, owner)
  const keys = Object.keys(flags)
  for (let i = 0; i < keys.length; ++i) {
    memorywritebookflag(book, owner, keys[i], flags[keys[i]])
  }
  return memoryreadbookflags(book, owner)
}
