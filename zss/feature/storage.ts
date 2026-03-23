import humanid from 'human-id'
import {
  get as idbget,
  getMany as idbgetmany,
  update as idbupdate,
} from 'idb-keyval'
import { apierror, apilog, vmbooks } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { isclimode } from 'zss/feature/detect'
import { doasync } from 'zss/mapping/func'
import { isarray, ispresent } from 'zss/mapping/types'
import { BOOK } from 'zss/memory/types'

import { shorturl } from './url'
import { writecopyit } from './writeui'

// read / write from indexdb

async function readidb<T>(key: string): Promise<T | undefined> {
  return idbget(key)
}

async function writeidb<T>(
  key: string,
  updater: (oldValue: T | undefined) => T,
): Promise<void> {
  return idbupdate(key, updater)
}

export function storagereadconfigdefault(name: string) {
  switch (name) {
    case 'crt':
      return 'on'
    case 'loaderlogging':
    case 'promptlogging':
      return 'off'
    default:
      return 'off'
  }
}

export async function storagereadconfig(name: string) {
  if (
    isclimode() &&
    typeof (window as any).__nodeStorageReadConfig === 'function'
  ) {
    const value = await (window as any).__nodeStorageReadConfig(name)
    return value && value !== 'off' ? 'on' : 'off'
  }
  const value = await readidb<string>(`config_${name}`)
  if (!value) {
    return storagereadconfigdefault(name)
  }
  return value && value !== 'off' ? 'on' : 'off'
}

export async function storagewriteconfig(name: string, value: string) {
  if (
    isclimode() &&
    typeof (window as any).__nodeStorageWriteConfig === 'function'
  ) {
    return (window as any).__nodeStorageWriteConfig(name, value)
  }
  return writeidb(`config_${name}`, () => value)
}

export async function storagereadconfigall() {
  if (
    isclimode() &&
    typeof (window as any).__nodeStorageReadConfigAll === 'function'
  ) {
    return (window as any).__nodeStorageReadConfigAll()
  }
  const lookup = [
    'config_crt',
    'config_lowrez',
    'config_scanlines',
    'config_voice2text',
    'config_loaderlogging',
    'config_promptlogging',
  ]
  const configs = await idbgetmany<string>(lookup)
  return configs.map((value, index) => {
    const key = lookup[index]
    const keyname = key.replace('config_', '')
    if (!value) {
      return [keyname, storagereadconfigdefault(keyname)]
    }
    return [keyname, value && value !== 'off' ? 'on' : 'off']
  })
}

export async function storagereadhistorybuffer() {
  if (
    isclimode() &&
    typeof (window as any).__nodeStorageReadHistoryBuffer === 'function'
  ) {
    return (window as any).__nodeStorageReadHistoryBuffer()
  }
  return readidb<string[]>('HISTORYBUFFER')
}

export async function storagewritehistorybuffer(historybuffer: string[]) {
  if (
    isclimode() &&
    typeof (window as any).__nodeStorageWriteHistoryBuffer === 'function'
  ) {
    return (window as any).__nodeStorageWriteHistoryBuffer(historybuffer)
  }
  return writeidb('HISTORYBUFFER', () => historybuffer)
}

async function writelocalurl(fullurl: string) {
  let shorturl = await readidb<string>(fullurl)
  if (shorturl === undefined) {
    // build short url
    while (shorturl === undefined) {
      const maybeurl = humanid({
        addAdverb: true,
        capitalize: false,
        adjectiveCount: 2,
      })
      const hasvalue = await readidb<string>(maybeurl)
      if (hasvalue === undefined) {
        shorturl = maybeurl
      }
    }
    // write lookups
    await writeidb(fullurl, () => shorturl)
    await writeidb(shorturl, () => fullurl)
  }
  return shorturl
}

async function readlocalurl(shorturl: string) {
  return await readidb<string>(shorturl)
}

// read / write from window url #hash

function readurlhash(player: string) {
  try {
    const hash = location.hash.slice(1)
    if (hash.length) {
      return hash
    }
  } catch (err: any) {
    apierror(SOFTWARE, player, 'crash', err.message)
  }
  return ''
}

export async function storagereadcontent(
  player: string,
): Promise<string | BOOK[]> {
  if (
    isclimode() &&
    typeof (window as any).__nodeStorageReadContent === 'function'
  ) {
    const content = await (window as any).__nodeStorageReadContent(player)
    return content ?? ''
  }
  const urlcontent = readurlhash(player)
  if (urlcontent.length) {
    // see if its a shorturlhash
    const maybefullurlcontent = await readlocalurl(urlcontent)
    if (
      ispresent(maybefullurlcontent) &&
      maybefullurlcontent.length > urlcontent.length
    ) {
      return maybefullurlcontent
    }
    return urlcontent
  }
  return ''
}

export async function storagewritecontent(
  player: string,
  label: string,
  longcontent: string,
  compressed: string,
  books: BOOK[],
) {
  if (
    isclimode() &&
    typeof (window as any).__nodeStorageWriteContent === 'function'
  ) {
    await (window as any).__nodeStorageWriteContent(
      player,
      label,
      longcontent,
      compressed,
      books,
    )
    const msg = `wrote ${longcontent.length} chars [${longcontent.slice(0, 8)}...${longcontent.slice(-8)}]`
    if (!label.includes('autosave')) {
      apilog(SOFTWARE, player, msg)
    }
    return
  }
  if (compressed.length > 2048) {
    const short = await writelocalurl(compressed)
    return storagewritecontent(player, label, longcontent, short, books)
  }
  const newurlhash = `#${compressed}`
  if (location.hash !== newurlhash) {
    // saving current state, don't interrupt the user
    currenturlhash = compressed
    location.hash = newurlhash
    const msg = `wrote ${longcontent.length} chars [${longcontent.slice(0, 8)}...${longcontent.slice(-8)}]`
    if (!label.includes('autosave')) {
      apilog(SOFTWARE, player, msg)
    }
    document.title = label
  }
}

export async function storagereadvars(): Promise<Record<string, any>> {
  if (
    isclimode() &&
    typeof (window as any).__nodeStorageReadVars === 'function'
  ) {
    return (window as any).__nodeStorageReadVars()
  }
  const storage = await readidb<Record<string, any>>('storage')
  return storage ?? {}
}

export async function storagewritevar(name: string, value: any) {
  if (
    isclimode() &&
    typeof (window as any).__nodeStorageWriteVar === 'function'
  ) {
    return (window as any).__nodeStorageWriteVar(name, value)
  }
  const storage = await storagereadvars()
  storage[name] = value
  return writeidb('storage', () => storage)
}

export async function storagereadnetid(): Promise<string | undefined> {
  return readidb<string>('netid')
}

export async function storagewritenetid(netid: string) {
  return writeidb('netid', () => netid)
}

let currenturlhash = ''
export function storagewatchcontent(player: string) {
  if (isclimode()) {
    return
  }
  window.addEventListener('hashchange', () => {
    doasync(SOFTWARE, player, async () => {
      const urlhash = readurlhash(player)
      if (currenturlhash !== urlhash) {
        console.info('hashchange', urlhash)
        currenturlhash = urlhash
        const urlcontent = await storagereadcontent(player)
        // init vm with content
        vmbooks(SOFTWARE, player, urlcontent)
      }
    })
  })
}

export async function storagesharecontent(player: string) {
  if (isclimode()) {
    apierror(SOFTWARE, player, 'storage', '#share not supported in server mode')
    return
  }
  // unpack short url before sharing
  const urlcontent = await storagereadcontent(player)
  if (isarray(urlcontent)) {
    apierror(SOFTWARE, player, 'storage', '#share not supported in server mode')
    return
  }
  // share full content
  const out = `#${urlcontent}`
  currenturlhash = urlcontent
  location.hash = out
  // gen global shorturl
  const url = await shorturl(location.href)
  writecopyit(SOFTWARE, player, url, url)
}

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
export function storagenukecontent(_player: string) {
  if (isclimode()) {
    const nodewindow = window as { __nodeStorageNukeContent?: () => void }
    if (typeof nodewindow.__nodeStorageNukeContent === 'function') {
      nodewindow.__nodeStorageNukeContent()
    }
    return
  }
  // nuke is the only valid case for reload
  location.hash = ''
  currenturlhash = location.hash
  location.reload()
}
