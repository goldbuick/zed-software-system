import { registerinspector } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { getclimode } from 'zss/feature/detect'
import { storagewriteconfig } from 'zss/feature/storage'
import { CONFIG_KEYS } from 'zss/feature/storagekeys'
import { isjoin } from 'zss/feature/url'
import { DIVIDER, zsstexttape, zsszedlinklinechip } from 'zss/feature/zsstextui'
import { registerhyperlinksharedbridge } from 'zss/gadget/data/api'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { qrlines } from 'zss/mapping/qr'
import { escapedoublequoted, scrolllinkescapefrag } from 'zss/mapping/string'
import { ispresent, isstring } from 'zss/mapping/types'
import { COLOR } from 'zss/words/types'

import { READ_LAYER, memoryreadelement } from './boardaccess'
import {
  memoryreadelementdisplay,
  memoryreadflags,
} from './bookoperations'
import type { MEMORY_BOOKS_BUNDLE } from './memorysnapshotio'
import { memoryreadplayerboard } from './playermanagement'
import {
  memoryisoperator,
  memoryreadmainbook,
  memoryreadoperator,
  memoryreadtopic,
  memorywritehalt,
} from './session'
import { BOOK } from './types'

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
    const playerelement = memoryreadelement(playerboard, pid, READ_LAYER.OBJECT)
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

/**
 * Browser sim: post a book snapshot to the compress worker.
 * Headless/climode and Jest call `memoryserializesnapshot` directly.
 */
export async function memorycompressbooks(books: BOOK[]): Promise<string> {
  const snapshot: MEMORY_BOOKS_BUNDLE = {
    main: memoryreadmainbook()?.id,
    books,
  }
  // Keep off the utilities import graph: Jest cannot transform compressspace??worker.
  const { serializesnapshotoffthread } = await import('zss/compressworkerclient')
  return serializesnapshotoffthread(snapshot)
}

/**
 * Browser sim: post a base64 save string to the compress worker.
 * Headless/climode and Jest call `memorydeserializesnapshot` directly.
 */
export async function memorydecompressbooks(
  base64bytes: string,
): Promise<MEMORY_BOOKS_BUNDLE> {
  // Keep off the utilities import graph: Jest cannot transform compressspace??worker.
  const { deserializesnapshotoffthread } =
    await import('zss/compressworkerclient')
  return deserializesnapshotoffthread(base64bytes)
}
