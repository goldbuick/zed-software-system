import { compress, decompress } from '@bokuweb/zstd-wasm'
import JSZip, { JSZipObject } from 'jszip'
import { registerinspector, registerstore } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { getclimode } from 'zss/feature/detect'
import {
  formatobject,
  packformat,
  unformatobject,
  unpackformat,
} from 'zss/feature/format'
import { isjoin } from 'zss/feature/url'
import { DIVIDER, zsstexttape, zsszedlinklinechip } from 'zss/feature/zsstextui'
import { ensurezstdwasm } from 'zss/feature/zstdwasm'
import { registerhyperlinksharedbridge } from 'zss/gadget/data/api'
import {
  scrolllinkescapefrag,
  scrollwritelines,
} from 'zss/gadget/data/scrollwritelines'
import { qrlines } from 'zss/mapping/qr'
import { ispresent, isstring } from 'zss/mapping/types'
import { COLOR } from 'zss/words/types'

import { memoryreadobject } from './boardaccess'
import {
  memoryexportbook,
  memoryimportbook,
  memoryreadelementdisplay,
} from './bookoperations'
import {
  memoryexportcodepage,
  memoryimportcodepage,
} from './codepageoperations'
import { memoryreadflags } from './flags'
import { memoryreadplayerboard } from './playermanagement'
import {
  memoryisoperator,
  memoryreadbookbysoftware,
  memoryreadoperator,
  memoryreadtopic,
  memorywritehalt,
} from './session'
import { BOOK, BOOK_KEYS, FIXED_DATE, MEMORY_LABEL } from './types'

// In-memory config (register sends at login; utilities render/emit only)
export const CONFIG_KEYS = [
  'crt',
  'lowrez',
  'scanlines',
  'voice2text',
  'loaderlogging',
  'promptlogging',
  'dev',
  'gadget',
] as const
const CONFIG_DEFAULTS: Record<string, string> = {
  crt: 'on',
  lowrez: 'off',
  scanlines: 'off',
  voice2text: 'off',
  loaderlogging: 'off',
  promptlogging: 'off',
  dev: 'off',
  gadget: 'off',
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
  let buf = ''
  for (let i = 0; i < s.length; ++i) {
    const c = s.charAt(i)
    if (c === '\\' || c === '"') {
      buf += `\\${c}`
    } else {
      buf += c
    }
  }
  return `"${buf}"`
}

registerhyperlinksharedbridge(
  'admin',
  'select',
  (target) => {
    const p = parseadminselecttarget(target)
    if (!p) {
      return 0
    }
    return memoryreadconfig(p.key) === 'on' ? 1 : 0
  },
  (target, val) => {
    const p = parseadminselecttarget(target)
    if (!p) {
      return
    }
    const newval = val ? 'on' : 'off'
    memorywriteconfig(p.key, newval)
    registerstore(SOFTWARE, p.player, `config_${p.key}`, newval)
    if (p.key === 'dev') {
      memorywritehalt(newval === 'on')
    } else if (p.key === 'gadget') {
      registerinspector(SOFTWARE, p.player, newval === 'on')
    }
  },
)

// data encoding for urls
function base64urltobase64(base64UrlString: string) {
  // Replace non-url compatible chars with base64 standard chars
  const base64 = base64UrlString.replace(/-/g, '+').replace(/_/g, '/')
  // Pad out with standard base64 required padding characters if missing
  const missingpadding = '='.repeat((4 - (base64.length % 4)) % 4)
  // return full str
  return base64 + missingpadding
}

function base64tobase64url(base64String: string) {
  // Replace base64 standard chars with url compatible chars
  return base64String.replace(/\+/g, '-').replace(/\//g, '_')
}

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
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const activelistvalues = new Set<string>(mainbook?.activelist ?? [])
  activelistvalues.add(memoryreadoperator())
  const activelist = [...activelistvalues]

  const rows: string[] = []
  rows.push('active player list')
  rows.push(DIVIDER)
  for (let i = 0; i < activelist.length; ++i) {
    const pid = activelist[i]
    const { user } = memoryreadflags(pid)
    const withuser = isstring(user) ? user : 'player'
    const playerboard = memoryreadplayerboard(pid)
    const playerelement = memoryreadobject(playerboard, pid)
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

export function memoryexportbooksasjson(books: BOOK[]): string {
  const plainobjs: object[] = []
  for (let i = 0; i < books.length; ++i) {
    const exported = memoryexportbook(books[i])
    if (ispresent(exported)) {
      const plain = unformatobject(exported, BOOK_KEYS, {
        pages: (pages) => pages.map(memoryimportcodepage),
      })
      if (ispresent(plain)) {
        plainobjs.push(plain)
      }
    }
  }
  return JSON.stringify(plainobjs, null, 2)
}

export function memoryimportbooksfromjson(json: string): BOOK[] {
  const arr = JSON.parse(json) as object[]
  if (!Array.isArray(arr)) {
    return []
  }
  const books: BOOK[] = []
  for (let i = 0; i < arr.length; ++i) {
    const plain = arr[i] as Record<string, unknown>
    const formatted = formatobject(plain, BOOK_KEYS, {
      pages: (p: unknown[]) =>
        (p ?? []).map((page) => memoryexportcodepage(page as any)),
    })
    if (ispresent(formatted)) {
      const book = memoryimportbook(formatted)
      if (ispresent(book)) {
        books.push(book)
      }
    }
  }
  return books
}

export async function memorycompressbooks(books: BOOK[]) {
  if (getclimode()) {
    return memoryexportbooksasjson(books)
  }
  await ensurezstdwasm()

  console.info('saved', books)
  const zip = new JSZip()
  for (let i = 0; i < books.length; ++i) {
    const book = books[i]
    const exportedbook = memoryexportbook(book)
    if (exportedbook) {
      // convert to bin
      const bin = packformat(exportedbook)
      if (ispresent(bin)) {
        // NOTE: NOT using dictionary here, it's not worth the extra complexity
        // AND it did not make a significant difference in size
        // https://github.com/bokuweb/zstd-wasm?tab=readme-ov-file#using-dictionary
        const binsquash = compress(bin, 15)
        zip.file(book.id, binsquash, { date: FIXED_DATE })
      }
    }
  }

  // TODO: do we need this still ??
  const content = await zip.generateAsync({
    type: 'base64',
  })

  return base64tobase64url(content)
}

export async function memorydecompressbooks(base64bytes: string) {
  const trimmed = base64bytes.trim()
  if (trimmed.startsWith('[')) {
    return memoryimportbooksfromjson(base64bytes)
  }
  await ensurezstdwasm()

  const books: BOOK[] = []
  const content = base64urltobase64(base64bytes)
  const zip = await JSZip.loadAsync(content, { base64: true })

  // extract a normal list
  const files: JSZipObject[] = []
  zip.forEach((_path, file) => files.push(file))

  // unpack books
  for (let i = 0; i < files.length; ++i) {
    const file = files[i]

    // first pass try string
    const str = await file.async('string')
    const maybebookfromstr = unpackformat(str)
    if (ispresent(maybebookfromstr)) {
      const book = memoryimportbook(maybebookfromstr)
      if (ispresent(book)) {
        books.push(book)
        continue
      }
    }

    // second pass uncompressed msgpackr
    const bin = await file.async('uint8array')
    const maybebookfrombin = unpackformat(bin)
    if (ispresent(maybebookfrombin)) {
      const book = memoryimportbook(maybebookfrombin)
      if (ispresent(book)) {
        books.push(book)
        continue
      }
    }

    // second pass compressed msgpackr
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
