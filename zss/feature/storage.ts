import { appDataDir, join } from '@tauri-apps/api/path'
import {
  BaseDirectory,
  mkdir,
  readTextFile,
  writeTextFile,
} from '@tauri-apps/plugin-fs'
import { revealItemInDir } from '@tauri-apps/plugin-opener'
import humanid from 'human-id'
import {
  get as idbget,
  getMany as idbgetmany,
  update as idbupdate,
} from 'idb-keyval'
import { apierror, apilog, vmbooks } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { doasync } from 'zss/mapping/func'
import { isarray, ispresent } from 'zss/mapping/types'
import { BOOK } from 'zss/memory/types'

import { shorturl } from './url'
import { write, writecopyit } from './writeui'

// detect what kind of container we are in
const istauri =
  typeof window !== 'undefined' &&
  ('__TAURI__' in window || '__TAURI_INTERNALS__' in window)

const FILE_SOURCE = 'zss-content.json'

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
    default:
      return 'off'
  }
}

export async function storagereadconfig(name: string) {
  const value = await readidb<string>(`config_${name}`)

  if (!value) {
    return storagereadconfigdefault(name)
  }

  return value && value !== 'off' ? 'on' : 'off'
}

export async function storagewriteconfig(name: string, value: string) {
  return writeidb(`config_${name}`, () => value)
}

export async function storagereadconfigall() {
  const lookup = [
    'config_crt',
    'config_lowrez',
    'config_scanlines',
    'config_voice2text',
    'config_loaderlogging',
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
  return readidb<string[]>('HISTORYBUFFER')
}

export async function storagewritehistorybuffer(historybuffer: string[]) {
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
  const urlcontent = readurlhash(player)
  if (istauri) {
    if (urlcontent.length) {
      write(SOFTWARE, player, `reading url content, make sure to save`)
      // clear the hash
      location.hash = ''
      // we only support long urls in tauri mode
      return urlcontent
    }
    try {
      write(SOFTWARE, player, `reading ${FILE_SOURCE}`)
      const content = await readTextFile(FILE_SOURCE, {
        baseDir: BaseDirectory.AppData,
      })
      return JSON.parse(content)
    } catch (err: any) {
      apierror(SOFTWARE, player, 'readcontent', err.toString())
      return []
    }
  }
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
  if (istauri) {
    try {
      write(SOFTWARE, player, `writing ${FILE_SOURCE}`)
      await writeTextFile(FILE_SOURCE, JSON.stringify(books, null, 2), {
        baseDir: BaseDirectory.AppData,
        create: true,
      })
    } catch (err: any) {
      apierror(SOFTWARE, player, 'writecontent', err.toString())
    }
    return
  }
  if (compressed.length > 2048) {
    const shorturl = await writelocalurl(compressed)
    return storagewritecontent(player, label, longcontent, shorturl, books)
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
  const storage = await readidb<Record<string, any>>('storage')
  return storage ?? {}
}

export async function storagewritevar(name: string, value: any) {
  const storage = await storagereadvars()
  storage[name] = value
  return writeidb('storage', () => storage)
}

// either browser or tauri setup here ...

let currenturlhash = ''
export async function storagewatchcontent(player: string) {
  if (istauri) {
    await mkdir('', { baseDir: BaseDirectory.AppData, recursive: true })
    try {
      const appdata = await appDataDir()
      const item = await join(appdata, FILE_SOURCE)
      await revealItemInDir(item)
    } catch (err: any) {
      apierror(SOFTWARE, player, 'storage', err.toString())
    }
    return
  }
  window.addEventListener('hashchange', () => {
    doasync(SOFTWARE, player, async () => {
      const urlhash = readurlhash(player)
      if (currenturlhash !== urlhash) {
        currenturlhash = urlhash
        const urlcontent = await storagereadcontent(player)
        // init vm with content
        vmbooks(SOFTWARE, player, urlcontent)
      }
    })
  })
}

export async function storagesharecontent(player: string) {
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

export function storagenukecontent(player: string) {
  if (istauri) {
    apierror(SOFTWARE, player, 'storage', '#nuke not supported in server mode')
    return
  }
  // nuke is the only valid case for reload
  location.hash = ''
  currenturlhash = location.hash
  location.reload()
}
