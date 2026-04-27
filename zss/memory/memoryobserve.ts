/**
 * Reactive MEMORY: deep Proxy observation → memorymarkdirty / correct replication stream.
 * Root loaders + topic are not wrapped (not on memory jsonsync projection).
 */
import { ispid } from 'zss/mapping/guid'
import { isbook, isstring } from 'zss/mapping/types'

import {
  boardstream,
  flagsstream,
  memorymarkdirty,
  memorymarkmemorydirty,
} from './memorydirty'
import type { BOARD, BOARD_ELEMENT, BOOK, BOOK_FLAGS, CODE_PAGE } from './types'

type MAYBE<T> = T | undefined

/** Same shape as MEMORY_ROOT in session.ts (avoid circular import). */
export type SESSION_OBSERVE_ROOT = {
  halt: boolean
  freeze: boolean
  session: string
  operator: string
  software: { main: string; game: string }
  books: Map<string, BOOK>
  loaders: Map<string, string>
  topic: string
}

const ARRAY_MUTABLE = new Set([
  'push',
  'pop',
  'splice',
  'shift',
  'unshift',
  'sort',
  'reverse',
  'fill',
  'copyWithin',
])

const bookproxy = new WeakMap<object, BOOK>()
const boardproxy = new WeakMap<object, BOARD>()
const codepageproxy = new WeakMap<object, CODE_PAGE>()
const elementproxy = new WeakMap<object, BOARD_ELEMENT>()
/** Plain flag-bag object → its single wrapflagbag Proxy (avoid `new Proxy` on a Proxy → infinite [[Set]]). */
const flagbagproxybyplain = new WeakMap<object, BOOK_FLAGS>()
const flagbagplainbyproxy = new WeakMap<object, BOOK_FLAGS>()

function resolvedbook(b: BOOK): BOOK {
  const asproxy = bookproxy.get(b)
  return asproxy ?? b
}

function markflagsflagkey(flagkey: PropertyKey): void {
  const ks = String(flagkey)
  if (ispid(ks)) {
    memorymarkdirty(flagsstream(ks))
  } else {
    memorymarkmemorydirty()
  }
}

function markboardid(boardid: string): void {
  if (boardid) {
    memorymarkdirty(boardstream(boardid))
  }
}

/** Proxy deleteProperty must return true for missing keys (successful no-op). */
function proxydelete(
  t: object,
  prop: PropertyKey,
  onremoved: () => void,
): boolean {
  if (!Reflect.has(t, prop)) {
    return true
  }
  const ok = Reflect.deleteProperty(t, prop)
  if (ok) {
    onremoved()
  }
  return ok
}

function wrapelement(plain: BOARD_ELEMENT, boardid: string): BOARD_ELEMENT {
  const hit = elementproxy.get(plain)
  if (hit) {
    return hit
  }
  const p = new Proxy(plain, {
    set(t, prop, val) {
      Reflect.set(t, prop, val, t)
      markboardid(boardid)
      return true
    },
    deleteProperty(t, prop) {
      return proxydelete(t, prop, () => markboardid(boardid))
    },
  })
  elementproxy.set(plain, p)
  elementproxy.set(p, p)
  return p
}

function wrapboardobjects(
  objs: Record<string, BOARD_ELEMENT>,
  boardid: string,
): Record<string, BOARD_ELEMENT> {
  const keys = Object.keys(objs)
  for (let i = 0; i < keys.length; ++i) {
    const k = keys[i]
    objs[k] = wrapelement(objs[k], boardid)
  }
  return new Proxy(objs, {
    set(t, prop, val, recv) {
      void recv
      const v =
        val && typeof val === 'object'
          ? wrapelement(val as BOARD_ELEMENT, boardid)
          : val
      Reflect.set(t, prop, v, t)
      markboardid(boardid)
      return true
    },
    deleteProperty(t, prop) {
      return proxydelete(t, prop, () => markboardid(boardid))
    },
  })
}

function wrapboardterrain(
  terrain: MAYBE<BOARD_ELEMENT>[],
  boardid: string,
): MAYBE<BOARD_ELEMENT>[] {
  for (let i = 0; i < terrain.length; ++i) {
    const c = terrain[i]
    if (c && typeof c === 'object') {
      terrain[i] = wrapelement(c, boardid)
    }
  }
  return wrapmutarray(
    terrain as BOARD_ELEMENT[],
    () => markboardid(boardid),
    (added) => {
      if (added && typeof added === 'object') {
        return wrapelement(added as BOARD_ELEMENT, boardid)
      }
      return added
    },
  ) as MAYBE<BOARD_ELEMENT>[]
}

function wrapmutarray<T>(
  arr: T[],
  onmutate: () => void,
  wrapitem?: (v: unknown, index: number) => unknown,
): T[] {
  return new Proxy(arr, {
    set(target, prop, value) {
      let v = value
      if (
        wrapitem &&
        prop !== 'length' &&
        (typeof prop === 'string' || typeof prop === 'number')
      ) {
        const idx =
          typeof prop === 'number' ? prop : Number.parseInt(String(prop), 10)
        if (Number.isFinite(idx)) {
          v = wrapitem(value, idx) as T
        }
      }
      Reflect.set(target, prop, v, target)
      onmutate()
      return true
    },
    get(target, prop, recv) {
      const v = Reflect.get(target, prop, recv)
      if (typeof v !== 'function' || typeof prop !== 'string') {
        return v
      }
      if (!ARRAY_MUTABLE.has(prop)) {
        return v
      }
      return (...args: unknown[]) => {
        const fn = v as (...a: unknown[]) => unknown
        if (wrapitem && prop === 'push') {
          const next = args.map((a, i) => wrapitem(a, target.length + i))
          const r = fn.apply(target, next)
          onmutate()
          return r
        }
        if (wrapitem && prop === 'unshift') {
          const next = args.map((a, i) => wrapitem(a, i))
          const r = fn.apply(target, next)
          onmutate()
          return r
        }
        if (wrapitem && prop === 'splice') {
          const a0 = args[0]
          const start = typeof a0 === 'number' ? a0 : 0
          const deleted = Number(args[1] ?? 0)
          const insert = args.slice(2).map((a, i) => wrapitem(a, start + i))
          const r = fn.apply(target, [start, deleted, ...insert])
          onmutate()
          return r
        }
        const r = fn.apply(target, args)
        onmutate()
        return r
      }
    },
  })
}

function wrapboard(plain: BOARD): BOARD {
  const hit = boardproxy.get(plain)
  if (hit) {
    return hit
  }
  const bid = isstring(plain.id) ? plain.id : ''
  plain.terrain = wrapboardterrain(plain.terrain, bid)
  plain.objects = wrapboardobjects(plain.objects ?? {}, bid)
  const p = new Proxy(plain, {
    set(t, prop, value) {
      if (prop === 'terrain') {
        Reflect.set(
          t,
          prop,
          wrapboardterrain((value ?? []) as MAYBE<BOARD_ELEMENT>[], t.id),
        )
      } else if (prop === 'objects') {
        Reflect.set(
          t,
          prop,
          wrapboardobjects(
            (value ?? {}) as Record<string, BOARD_ELEMENT>,
            t.id,
          ),
        )
      } else {
        Reflect.set(t, prop, value)
      }
      markboardid(t.id)
      return true
    },
    deleteProperty(t, prop) {
      return proxydelete(t, prop, () => markboardid(t.id))
    },
  })
  boardproxy.set(plain, p)
  boardproxy.set(p, p)
  return p
}

function wrapcodepage(plain: CODE_PAGE): CODE_PAGE {
  const hit = codepageproxy.get(plain)
  if (hit) {
    return hit
  }
  if (plain.board) {
    plain.board = wrapboard(plain.board)
  }
  const p = new Proxy(plain, {
    set(t, prop, value) {
      if (prop === 'board') {
        const next =
          value && typeof value === 'object'
            ? wrapboard(value as BOARD)
            : (value as MAYBE<BOARD>)
        Reflect.set(t, prop, next)
        if (next && isstring(next.id)) {
          markboardid(next.id)
        } else {
          memorymarkmemorydirty()
        }
        return true
      }
      Reflect.set(t, prop, value)
      memorymarkmemorydirty()
      return true
    },
    deleteProperty(t, prop) {
      return proxydelete(t, prop, () => memorymarkmemorydirty())
    },
  })
  codepageproxy.set(plain, p)
  codepageproxy.set(p, p)
  return p
}

function wrapbookpages(pages: CODE_PAGE[]): CODE_PAGE[] {
  for (let i = 0; i < pages.length; ++i) {
    pages[i] = wrapcodepage(pages[i])
  }
  return wrapmutarray(
    pages,
    () => memorymarkmemorydirty(),
    (added) => {
      if (added && typeof added === 'object') {
        return wrapcodepage(added as CODE_PAGE)
      }
      return added
    },
  )
}

/** Nested `book.flags[outerkey]` so in-place `flags[pid].field = x` marks the right stream. */
function wrapflagbag(bag: BOOK_FLAGS, outerkey: string): BOOK_FLAGS {
  const o = bag as object
  const reuse = flagbagproxybyplain.get(o)
  if (reuse) {
    return reuse
  }
  if (flagbagplainbyproxy.has(o)) {
    return bag
  }
  const raw = o as BOOK_FLAGS
  const p = new Proxy(raw, {
    set(t, prop, val) {
      Reflect.set(t, prop, val)
      markflagsflagkey(outerkey)
      // mirror bookoperations memorywritebookflag: player `board` also bumps memory stream
      if (ispid(String(outerkey)) && String(prop) === 'board') {
        memorymarkmemorydirty()
      }
      return true
    },
    deleteProperty(t, prop) {
      return proxydelete(t, prop, () => markflagsflagkey(outerkey))
    },
  })
  flagbagproxybyplain.set(raw, p)
  flagbagplainbyproxy.set(p, raw)
  return p
}

function wrapbookflags(
  flags: Record<string, BOOK_FLAGS>,
): Record<string, BOOK_FLAGS> {
  const fk = Object.keys(flags)
  for (let i = 0; i < fk.length; ++i) {
    const k = fk[i]
    const bag = flags[k]
    if (bag && typeof bag === 'object') {
      flags[k] = wrapflagbag(bag, k)
    }
  }
  return new Proxy(flags, {
    set(t, prop, value, recv) {
      void recv
      const pk = String(prop)
      const wrapped =
        value && typeof value === 'object'
          ? wrapflagbag(value as BOOK_FLAGS, pk)
          : value
      Reflect.set(t, prop, wrapped, t)
      markflagsflagkey(prop)
      return true
    },
    deleteProperty(t, prop) {
      return proxydelete(t, prop, () => markflagsflagkey(prop))
    },
  })
}

function wrapbookactivelist(list: string[]): string[] {
  return wrapmutarray(list, () => memorymarkmemorydirty())
}

function observebook(plain: BOOK): BOOK {
  const hit = bookproxy.get(plain)
  if (hit) {
    return hit
  }
  plain.pages = wrapbookpages(plain.pages)
  plain.flags = wrapbookflags(plain.flags ?? {})
  plain.activelist = wrapbookactivelist(plain.activelist ?? [])
  const p = new Proxy(plain, {
    set(t, prop, value) {
      if (prop === 'pages') {
        Reflect.set(t, prop, wrapbookpages((value ?? []) as CODE_PAGE[]))
      } else if (prop === 'flags') {
        Reflect.set(
          t,
          prop,
          wrapbookflags((value ?? {}) as Record<string, BOOK_FLAGS>),
        )
      } else if (prop === 'activelist') {
        Reflect.set(t, prop, wrapbookactivelist((value ?? []) as string[]))
      } else {
        Reflect.set(t, prop, value)
      }
      memorymarkmemorydirty()
      return true
    },
    deleteProperty(t, prop) {
      return proxydelete(t, prop, () => memorymarkmemorydirty())
    },
  })
  bookproxy.set(plain, p)
  bookproxy.set(p, p)
  return p
}

function wrapsoftware(
  sw: SESSION_OBSERVE_ROOT['software'],
): SESSION_OBSERVE_ROOT['software'] {
  return new Proxy(sw, {
    set(t, prop, val, recv) {
      void recv
      Reflect.set(t, prop, val, t)
      memorymarkmemorydirty()
      return true
    },
  })
}

function wrapbooksmap(inn: Map<string, BOOK>): Map<string, BOOK> {
  for (const [k, v] of inn.entries()) {
    if (v && isbook(v)) {
      inn.set(k, observebook(v))
    }
  }
  return new Proxy(inn, {
    get(target, prop, recv) {
      const v = Reflect.get(target, prop, recv)
      if (prop === 'get') {
        return (key: string) => {
          const b = target.get(key)
          return b && isbook(b) ? resolvedbook(b) : b
        }
      }
      if (prop === 'set') {
        return (key: string, book: BOOK) => {
          const o = book && isbook(book) ? observebook(book) : book
          target.set(key, o)
          memorymarkmemorydirty()
          return target
        }
      }
      if (prop === 'delete') {
        return (key: string) => {
          const r = target.delete(key)
          if (r) {
            memorymarkmemorydirty()
          }
          return r
        }
      }
      if (prop === 'clear') {
        return () => {
          target.clear()
          memorymarkmemorydirty()
        }
      }
      if (prop === 'forEach') {
        return (
          fn: (
            book: BOOK | undefined,
            key: string,
            map: Map<string, BOOK>,
          ) => void,
          thisarg?: unknown,
        ) => {
          return target.forEach(function (this: unknown, book, key, map) {
            fn.call(thisarg, resolvedbook(book), key, map)
          }, thisarg)
        }
      }
      if (prop === 'values') {
        return function values() {
          const it = target.values()
          return {
            next() {
              const n = it.next()
              if (n.done || !n.value) {
                return n
              }
              const b = n.value
              return {
                value: b && isbook(b) ? resolvedbook(b) : b,
                done: false,
              }
            },
            [Symbol.iterator]() {
              return this
            },
          }
        }
      }
      if (prop === Symbol.iterator) {
        return function mapIterator() {
          const it = target[Symbol.iterator]() as Iterator<[string, BOOK]>
          return {
            next() {
              const n = it.next()
              if (n.done || !n.value) {
                return n
              }
              const pair = n.value
              return {
                value: [
                  pair[0],
                  pair[1] && isbook(pair[1]) ? resolvedbook(pair[1]) : pair[1],
                ] as const,
                done: false,
              }
            },
            [Symbol.iterator]() {
              return this
            },
          }
        }
      }
      if (prop === 'entries') {
        return function entries() {
          const inner = target.entries()
          return {
            next() {
              const n = inner.next()
              if (n.done || !n.value) {
                return n
              }
              const [id, book] = n.value
              return {
                value: [
                  id,
                  book && isbook(book) ? resolvedbook(book) : book,
                ] as const,
                done: false,
              }
            },
            [Symbol.iterator]() {
              return this
            },
          }
        }
      }
      return v
    },
  })
}

const ROOT_SYNC_KEYS = new Set(['halt', 'freeze', 'session', 'operator'])

/**
 * Wrap MEMORY_ROOT for automatic dirty streams. `loaders` and `topic` stay unwrapped
 * (not replicated on `memory`).
 */
export function memoryobserverootsession(
  mem: SESSION_OBSERVE_ROOT,
): SESSION_OBSERVE_ROOT {
  mem.software = wrapsoftware(mem.software)
  mem.books = wrapbooksmap(mem.books)
  return new Proxy(mem, {
    set(target, prop, value) {
      if (prop === 'books') {
        mem.books = wrapbooksmap(value as Map<string, BOOK>)
        memorymarkmemorydirty()
        return true
      }
      if (prop === 'software') {
        mem.software = wrapsoftware(
          (value ?? { main: '', game: '' }) as SESSION_OBSERVE_ROOT['software'],
        )
        memorymarkmemorydirty()
        return true
      }
      if (prop === 'loaders' || prop === 'topic') {
        Reflect.set(target, prop, value)
        return true
      }
      Reflect.set(target, prop, value)
      if (ROOT_SYNC_KEYS.has(String(prop))) {
        memorymarkmemorydirty()
      }
      return true
    },
  })
}
