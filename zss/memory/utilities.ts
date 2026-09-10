import { decompress } from '@bokuweb/zstd-wasm'
import JSZip, { JSZipObject } from 'jszip'
import { pack, unpack } from 'msgpackr'
import { registerinspector } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { getclimode } from 'zss/feature/detect'
import { FORMAT_OBJECT, unpackformat } from 'zss/feature/format'
import { storagewriteconfig } from 'zss/feature/storage'
import { CONFIG_KEYS } from 'zss/feature/storagekeys'
import { isjoin } from 'zss/feature/url'
import { DIVIDER, zsstexttape, zsszedlinklinechip } from 'zss/feature/zsstextui'
import { ensurezstdwasm } from 'zss/feature/zstdwasm'
import { registerhyperlinksharedbridge } from 'zss/gadget/data/api'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { base64urltobase64 } from 'zss/mapping/encode'
import { qrlines } from 'zss/mapping/qr'
import { escapedoublequoted, scrolllinkescapefrag } from 'zss/mapping/string'
import { MAYBE, ispresent, isstring } from 'zss/mapping/types'
import { COLOR } from 'zss/words/types'

import { memoryreadelement } from './boardaccess'
import {
  memoryexportbook,
  memoryimportbook,
  memoryreadelementdisplay,
  memoryreadflags,
} from './bookoperations'
import { bookzstdcompressbase64url } from './bookzstd'
import {
  applyexportidremap,
  buildexportidremap,
  collectflagprotectedids,
} from './exportidremap'
import { memoryreadplayerboard } from './playermanagement'
import {
  memoryisoperator,
  memoryreadmainbook,
  memoryreadoperator,
  memoryreadtopic,
  memorywritehalt,
} from './session'
import { trimformatobject, trimmemoryexport } from './trimexport'
import { BOOK } from './types'

function base64tobytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; ++i) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function iszipbytes(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b
}

const CONFIG_DEFAULTS: Record<string, string> = {
  crt: 'on',
  lowrez: 'off',
  scanlines: 'off',
  voice2text: 'off',
  loaderlogging: 'off',
  memoryfslogging: 'off',
  dev: 'off',
  gadget: 'off',
  touchui: 'off',
}

const CONFIG_STATE: Record<string, string> = {}

export function memorysetconfig(list: [string, string][]) {
  for (const [key, value] of list) {
    if (key && (value === 'on' || value === 'off')) {
      CONFIG_STATE[key] = value
    }
  }
}

export function memoryreadconfig(name: string): string {
  return CONFIG_STATE[name] ?? CONFIG_DEFAULTS[name] ?? 'off'
}

export function memoryreadconfigall(): [string, string][] {
  return CONFIG_KEYS.map((key) => [
    key,
    CONFIG_STATE[key] ?? CONFIG_DEFAULTS[key] ?? 'off',
  ])
}

export function memorywriteconfig(name: string, value: string) {
  if (CONFIG_KEYS.includes(name as (typeof CONFIG_KEYS)[number])) {
    CONFIG_STATE[name] = value === 'on' ? 'on' : 'off'
  }
}

function parseadminselecttarget(
  target: string,
): { player: string; key: string } | undefined {
  const idx = target.indexOf(':')
  if (idx <= 0 || idx >= target.length - 1) {
    return undefined
  }
  const playertok = target.slice(0, idx)
  const keytok = target.slice(idx + 1)
  if (!CONFIG_KEYS.includes(keytok as (typeof CONFIG_KEYS)[number])) {
    return undefined
  }
  return { player: playertok, key: keytok }
}

function quotescrollarg(s: string): string {
  return `"${escapedoublequoted(s)}"`
}

registerhyperlinksharedbridge(
  'admin',
  'select',
  (_typ, target) => {
    const p = parseadminselecttarget(target)
    if (!p) {
      return 0
    }
    return memoryreadconfig(p.key) === 'on' ? 1 : 0
  },
  (_typ, target, val) => {
    const p = parseadminselecttarget(target)
    if (!p) {
      return
    }
    const newval = val ? 'on' : 'off'
    memorywriteconfig(p.key, newval)
    void storagewriteconfig(p.key, newval)
    if (p.key === 'dev') {
      memorywritehalt(newval === 'on')
    } else if (p.key === 'gadget') {
      registerinspector(SOFTWARE, p.player, newval === 'on')
    }
  },
)

function formatidleseconds(ms: number | undefined): string {
  if (ms === undefined) {
    return ''
  }
  const sec = Math.floor((Date.now() - ms) / 1000)
  if (sec < 60) {
    return `${sec}s`
  }
  const min = Math.floor(sec / 60)
  if (min < 60) {
    return `${min}m`
  }
  return `${Math.floor(min / 60)}h`
}

export function memoryadminmenu(
  player: string,
  idletimes?: Record<string, number>,
) {
  const isop = memoryisoperator(player)
  const mainbook = memoryreadmainbook()
  const activelistvalues = new Set<string>(mainbook?.activelist ?? [])
  activelistvalues.add(memoryreadoperator())
  const activelist = [...activelistvalues]

  const rows: string[] = []
  rows.push('active player list')
  rows.push(DIVIDER)
  for (let i = 0; i < activelist.length; ++i) {
    const pid = activelist[i]
    const { user } = memoryreadflags(memoryreadmainbook(), pid)
    const withuser = isstring(user) ? user : 'player'
    const playerboard = memoryreadplayerboard(pid)
    const playerelement = memoryreadelement(playerboard, pid, {
      layer: 'object',
    })
    const icon = memoryreadelementdisplay(playerelement)
    const icontext = `$${COLOR[icon.color]}$ON${COLOR[icon.bg]}$${icon.char}$ONCLEAR$CYAN`
    const location = `$WHITEis on ${playerboard?.name ?? 'void board'}`
    const idletxt = idletimes ? formatidleseconds(idletimes[pid]) : ''
    const idletext = idletxt ? ` $GREY(idle ${idletxt})` : ''
    if (isop && ispresent(playerboard)) {
      rows.push(
        zsszedlinklinechip(
          'admingoto',
          pid,
          `${icontext} ${withuser} ${location}${idletext}`,
        ),
      )
    } else {
      rows.push(`${icontext} ${withuser} ${isop ? location : ''}${idletext}`)
    }
  }

  const configlist = memoryreadconfigall()
  rows.push('')
  rows.push('config list')
  rows.push(DIVIDER)
  for (let i = 0; i < configlist.length; ++i) {
    const [key] = configlist[i]
    const target = quotescrollarg(`${player}:${key}`)
    rows.push(zsszedlinklinechip('admin', `${target} select off 0 on 1`, key))
  }

  rows.push('')
  rows.push('multiplayer')
  rows.push(DIVIDER)
  const topic = memoryreadtopic()
  if (topic) {
    const base =
      getclimode() && !isjoin() ? 'https://zed.cafe' : location.origin
    const joinurl = isjoin() ? location.href : `${base}/join/#${topic}`
    rows.push(
      zsszedlinklinechip(
        'adminop',
        `copyit ${quotescrollarg(scrolllinkescapefrag(joinurl))}`,
        topic,
      ),
    )
    rows.push('')
    const ascii = qrlines(joinurl)
    for (let j = 0; j < ascii.length; ++j) {
      rows.push(ascii[j])
    }
  } else {
    rows.push('session not active')
    if (!isjoin()) {
      rows.push(
        zsszedlinklinechip('adminop', 'joincode', 'open multiplayer session'),
      )
    }
    rows.push('')
  }

  scrollwritelines(player, 'cpu #admin', zsstexttape(...rows), 'refscroll')
}

/** Save/load payload: books plus optional opened-book id (`MEMORY.main`). */
export type MEMORY_BOOKS_BUNDLE = {
  books: BOOK[]
  main?: string
}

function memoryimportbooklist(list: unknown): BOOK[] {
  if (!Array.isArray(list)) {
    return []
  }
  const books: BOOK[] = []
  for (let i = 0; i < list.length; ++i) {
    const book = memoryimportbook(list[i] as FORMAT_OBJECT)
    if (ispresent(book)) {
      books.push(book)
    }
  }
  return books
}

function memoryimportbooklistfromjson(list: unknown): BOOK[] {
  if (!Array.isArray(list)) {
    return []
  }
  return list
    .map((entry) =>
      memoryimportbook(entry as Record<string, unknown>, {
        format: 'json',
      }),
    )
    .filter(ispresent)
}

/**
 * Compress books for URL save / fork / share.
 * Sim owns export + cross-book id protect + msgpack; browser zstd runs on the
 * compress worker (in-process fallback / Jest). Climode uses JSON envelope.
 */
export async function memorycompressbooks(books: BOOK[]) {
  const main = memoryreadmainbook()?.id
  if (getclimode()) {
    const jsonbooks: unknown[] = []
    for (let i = 0; i < books.length; ++i) {
      const exported = trimmemoryexport(
        memoryexportbook(books[i], { format: 'json' }),
      )
      if (exported) {
        jsonbooks.push(exported)
      }
    }
    return JSON.stringify({ main, books: jsonbooks })
  }

  const wires: FORMAT_OBJECT[] = []
  for (let i = 0; i < books.length; ++i) {
    const wire = memoryexportbook(books[i], {
      noremap: true,
    }) as MAYBE<FORMAT_OBJECT>
    if (wire) {
      wires.push(wire)
    }
  }
  const protectedids = new Set<string>()
  for (let i = 0; i < wires.length; ++i) {
    const ids = collectflagprotectedids(wires[i])
    for (const id of ids) {
      protectedids.add(id)
    }
  }
  const exported: FORMAT_OBJECT[] = []
  for (let i = 0; i < wires.length; ++i) {
    applyexportidremap(wires[i], buildexportidremap(wires[i], protectedids))
    const trimmed = trimformatobject(wires[i])
    if (trimmed) {
      exported.push(trimmed)
    }
  }
  const bin = pack({ main, books: exported })
  const bytes = bin instanceof Uint8Array ? bin : new Uint8Array(bin)

  // Jest has no Vite ??worker transform for compressspace.
  if (
    typeof process !== 'undefined' &&
    typeof process.env?.JEST_WORKER_ID === 'string'
  ) {
    return bookzstdcompressbase64url(bytes)
  }

  try {
    const { compressbookbytesoffthread } =
      await import('zss/compressworkerclient')
    return await compressbookbytesoffthread(bytes)
  } catch {
    return bookzstdcompressbase64url(bytes)
  }
}

async function memorydecompressbookszip(content: string): Promise<BOOK[]> {
  const books: BOOK[] = []
  const zip = await JSZip.loadAsync(content, { base64: true })

  const files: JSZipObject[] = []
  zip.forEach((_path, file) => files.push(file))

  for (let i = 0; i < files.length; ++i) {
    const file = files[i]

    const str = await file.async('string')
    const maybebookfromstr = unpackformat(str)
    if (ispresent(maybebookfromstr)) {
      const book = memoryimportbook(maybebookfromstr)
      if (ispresent(book)) {
        books.push(book)
        continue
      }
    }

    const bin = await file.async('uint8array')
    const maybebookfrombin = unpackformat(bin)
    if (ispresent(maybebookfrombin)) {
      const book = memoryimportbook(maybebookfrombin)
      if (ispresent(book)) {
        books.push(book)
        continue
      }
    }

    const ubin = decompress(bin)
    const maybebookfromubin = unpackformat(ubin)
    if (ispresent(maybebookfromubin)) {
      const book = memoryimportbook(maybebookfromubin)
      if (ispresent(book)) {
        books.push(book)
      }
    }
  }

  return books
}

export async function memorydecompressbooks(
  base64bytes: string,
): Promise<MEMORY_BOOKS_BUNDLE> {
  const trimmed = base64bytes.trim()
  if (trimmed.startsWith('[')) {
    const json = JSON.parse(base64bytes) as unknown
    return { books: memoryimportbooklistfromjson(json) }
  }
  if (trimmed.startsWith('{')) {
    const json = JSON.parse(base64bytes) as {
      main?: string
      books?: unknown
    }
    return {
      books: memoryimportbooklistfromjson(json.books),
      main: isstring(json.main) ? json.main : undefined,
    }
  }

  await ensurezstdwasm()

  const content = base64urltobase64(base64bytes)
  const raw = base64tobytes(content)

  // Legacy: JSZip envelope (PK..) with per-book zstd|msgpack|json entries.
  if (iszipbytes(raw)) {
    return { books: await memorydecompressbookszip(content) }
  }

  // Current: zstd(msgpack({ main?, books })) — legacy: zstd(msgpack(FORMAT_OBJECT[]))
  const ubin = decompress(raw)
  const payload = unpack(ubin) as unknown
  if (Array.isArray(payload)) {
    return { books: memoryimportbooklist(payload) }
  }
  if (payload && typeof payload === 'object') {
    const envelope = payload as { main?: unknown; books?: unknown }
    return {
      books: memoryimportbooklist(envelope.books),
      main: isstring(envelope.main) ? envelope.main : undefined,
    }
  }
  return { books: [] }
}
