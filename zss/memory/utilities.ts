import { compress, decompress, init } from '@bokuweb/zstd-wasm'
import { getMany as idbgetmany, update as idbupdate } from 'idb-keyval'
import JSZip, { JSZipObject } from 'jszip'
import { SOFTWARE } from 'zss/device/session'
import { packformat, unpackformat } from 'zss/feature/format'
import { isjoin } from 'zss/feature/url'
import { DIVIDER } from 'zss/feature/writeui'
import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import { doasync } from 'zss/mapping/func'
import { qrlines } from 'zss/mapping/qr'
import { ispresent, isstring } from 'zss/mapping/types'
import { COLOR } from 'zss/words/types'

import { boardobjectread } from './boardoperations'
import {
  bookelementdisplayread,
  bookexport,
  bookimport,
} from './bookoperations'
import { memoryreadplayerboard } from './playermanagement'
import { BOOK } from './types'

import {
  MEMORY_LABEL,
  memoryisoperator,
  memoryreadbookbysoftware,
  memoryreadflags,
  memoryreadhalt,
  memoryreadoperator,
  memoryreadtopic,
} from '.'

// Compression & Serialization

let zstdenabled = false
async function getzstdlib(): Promise<void> {
  if (!zstdenabled) {
    await init()
    zstdenabled = true
  }
}

// data encoding for urls
function base64urltobase64(base64UrlString: string) {
  // Replace non-url compatible chars with base64 standard chars
  const base64 = base64UrlString.replace(/-/g, '+').replace(/_/g, '/')
  // Pad out with standard base64 required padding characters if missing
  const missingPadding = '='.repeat((4 - (base64.length % 4)) % 4)
  // return full str
  return base64 + missingPadding
}

function base64tobase64url(base64String: string) {
  // Replace base64 standard chars with url compatible chars
  return base64String.replace(/\+/g, '-').replace(/\//g, '_')
}

const FIXED_DATE = new Date('1980/09/02')

export async function compressbooks(books: BOOK[]) {
  await getzstdlib()

  console.info('saved', books)
  const zip = new JSZip()
  for (let i = 0; i < books.length; ++i) {
    const book = books[i]
    const exportedbook = bookexport(book)
    if (exportedbook) {
      // convert to bin
      const bin = packformat(exportedbook)
      if (ispresent(bin)) {
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

// import json into book
export async function decompressbooks(base64bytes: string) {
  await getzstdlib()

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
      const book = bookimport(maybebookfromstr)
      if (ispresent(book)) {
        books.push(book)
        continue
      }
    }

    // second pass uncompressed msgpackr
    const bin = await file.async('uint8array')
    const maybebookfrombin = unpackformat(bin)
    if (ispresent(maybebookfrombin)) {
      const book = bookimport(maybebookfrombin)
      if (ispresent(book)) {
        books.push(book)
        continue
      }
    }

    // second pass compressed msgpackr
    const ubin = decompress(bin)
    const maybebookfromubin = unpackformat(ubin)
    if (ispresent(maybebookfromubin)) {
      const book = bookimport(maybebookfromubin)
      if (ispresent(book)) {
        books.push(book)
      }
    }
  }

  return books
}

// Admin Operations

// read / write from indexdb

async function writeidb<T>(
  key: string,
  updater: (oldValue: T | undefined) => T,
): Promise<void> {
  return idbupdate(key, updater)
}

function readconfigdefault(name: string) {
  switch (name) {
    case 'crt':
      return 'on'
    default:
      return 'off'
  }
}

async function writeconfig(name: string, value: string) {
  return writeidb(`config_${name}`, () => value)
}

async function readconfigall() {
  const lookup = [
    'config_crt',
    'config_lowrez',
    'config_scanlines',
    'config_voice2text',
  ]
  const configs = await idbgetmany<string>(lookup)
  return configs.map((value, index) => {
    const key = lookup[index]
    const keyname = key.replace('config_', '')
    if (!value) {
      return [keyname, readconfigdefault(keyname)]
    }
    return [keyname, value && value !== 'off' ? 'on' : 'off']
  })
}

export async function memoryadminmenu(player: string) {
  // get list of active players
  const isop = memoryisoperator(player)
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const activelistvalues = new Set<string>(mainbook?.activelist ?? [])
  activelistvalues.add(memoryreadoperator())
  const activelist = [...activelistvalues]

  // build userlist
  gadgettext(player, `active player list`)
  gadgettext(player, DIVIDER)
  for (let i = 0; i < activelist.length; ++i) {
    const player = activelist[i]
    const { user } = memoryreadflags(player)
    const withuser = isstring(user) ? user : 'player'
    const playerboard = memoryreadplayerboard(player)
    const playerelement = boardobjectread(playerboard, player)
    const icon = bookelementdisplayread(playerelement)
    const icontext = `$${COLOR[icon.color]}$ON${COLOR[icon.bg]}$${icon.char}$ONCLEAR$CYAN`
    const location = `$WHITEis on ${playerboard?.name ?? 'void board'}`
    if (isop && ispresent(playerboard)) {
      gadgethyperlink(
        player,
        'admingoto',
        `${icontext} ${withuser} ${location}`,
        [player],
      )
    } else {
      gadgettext(player, `${icontext} ${withuser} ${isop ? location : ''}`)
    }
  }

  // build util list
  gadgettext(player, ``)
  gadgettext(player, `util list`)
  gadgettext(player, DIVIDER)
  gadgethyperlink(player, 'adminop', 'toggle #gadget inspector', ['gadget'])
  const halt = memoryreadhalt()
  gadgettext(player, `#dev mode is ${halt ? 'on' : 'off'}`)
  if (isop) {
    gadgethyperlink(
      player,
      'adminop',
      `turn ${halt ? 'off' : 'on'} #dev mode`,
      ['dev'],
    )
  }

  // build config list
  const configlist = await readconfigall()
  const configstate: Record<string, string> = {}
  gadgettext(player, ``)
  gadgettext(player, `config list`)
  gadgettext(player, DIVIDER)
  for (let i = 0; i < configlist.length; ++i) {
    const [key, value] = configlist[i]
    gadgethyperlink(
      player,
      'admin',
      key,
      [key, 'select', 'off', '0', 'on', '1'],
      (name) => {
        const newval = configstate[name] ?? value ?? readconfigdefault(name)
        return newval === 'on' ? 1 : 0
      },
      (name, value) => {
        configstate[name] = value ? 'on' : 'off'
        doasync(SOFTWARE, player, async () => {
          await writeconfig(name, configstate[name])
        })
      },
    )
  }

  // build qr code
  gadgettext(player, ``)
  gadgettext(player, `multiplayer`)
  gadgettext(player, DIVIDER)
  const topic = memoryreadtopic()
  if (topic) {
    const joinurl = isjoin()
      ? location.href
      : `${location.origin}/join/#${topic}`
    gadgethyperlink(player, 'adminop', topic, ['copyit', joinurl])
    gadgettext(player, ``)
    const ascii = qrlines(joinurl)
    for (let i = 0; i < ascii.length; i++) {
      gadgettext(player, ascii[i])
    }
  } else {
    gadgettext(player, `session not active`)
    if (!isjoin()) {
      gadgethyperlink(player, 'adminop', 'open multiplayer session', [
        'joincode',
      ])
    }
    gadgettext(player, ``)
  }

  const shared = gadgetstate(player)
  shared.scrollname = 'cpu #admin'
  shared.scroll = gadgetcheckqueue(player)
}
