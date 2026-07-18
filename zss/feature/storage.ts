import humanid from 'human-id'
import { apierror, apilog, vmbooks, workstatus } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { SOFTWARE } from 'zss/device/session'
import { isclimode } from 'zss/feature/detect'
import {
  durabledel,
  durableget,
  durablegetmany,
  durableupdate,
} from 'zss/feature/durable'
import { isarray, ispresent } from 'zss/mapping/types'
import { BOOK } from 'zss/memory/types'

import { shorturl, znsnormalizenamespace } from './url'
import { writecopyit } from './writeui'

export function storagereadconfigdefault(name: string) {
  switch (name) {
    case 'crt':
      return 'on'
    case 'loaderlogging':
      return 'off'
    default:
      return 'off'
  }
}

export async function storagereadconfig(name: string) {
  const value = await durableget<string>(`config_${name}`)
  if (!value) {
    return storagereadconfigdefault(name)
  }
  return value && value !== 'off' ? 'on' : 'off'
}

export async function storagewriteconfig(name: string, value: string) {
  return durableupdate(`config_${name}`, () => value)
}

export async function storagereadconfigstring(name: string) {
  return durableget<string>(`config_${name}`)
}

export async function storagewriteconfigstring(name: string, value: string) {
  return durableupdate(`config_${name}`, () => value)
}

export async function storagereadconfigall() {
  const lookup = [
    'config_crt',
    'config_lowrez',
    'config_scanlines',
    'config_voice2text',
    'config_loaderlogging',
    'config_dev',
    'config_gadget',
  ]
  const configs = await durablegetmany<string>(lookup)
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
  return durableget<string[]>('HISTORYBUFFER')
}

export async function storagewritehistorybuffer(historybuffer: string[]) {
  return durableupdate('HISTORYBUFFER', () => historybuffer)
}

async function writelocalurl(fullurl: string) {
  let shorturl = await durableget<string>(fullurl)
  if (shorturl === undefined) {
    // build short url
    while (shorturl === undefined) {
      const maybeurl = humanid({
        addAdverb: true,
        capitalize: false,
        adjectiveCount: 2,
      })
      const hasvalue = await durableget<string>(maybeurl)
      if (hasvalue === undefined) {
        shorturl = maybeurl
      }
    }
    // write lookups
    await durableupdate(fullurl, () => shorturl!)
    await durableupdate(shorturl, () => fullurl)
  }
  return shorturl
}

async function readlocalurl(shorturl: string) {
  return await durableget<string>(shorturl)
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
    typeof (globalThis as any).__nodeStorageReadContent === 'function'
  ) {
    const content = await (globalThis as any).__nodeStorageReadContent(player)
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
  const isautosave = label.includes('autosave')
  if (!isautosave) {
    workstatus(SOFTWARE, player, 'save url')
  }
  if (
    isclimode() &&
    typeof (globalThis as any).__nodeStorageWriteContent === 'function'
  ) {
    await (globalThis as any).__nodeStorageWriteContent(
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
  const storage = await durableget<Record<string, any>>('storage')
  return storage ?? {}
}

export async function storagewritevar(name: string, value: any) {
  return durableupdate<Record<string, any>>('storage', (storage) => {
    const blob = storage ?? {}
    blob[name] = value
    return blob
  })
}

export async function storagereadnetid(): Promise<string | undefined> {
  return durableget<string>('netid')
}

export async function storagewritenetid(netid: string) {
  return durableupdate('netid', () => netid)
}

export async function storagereadznsemail(): Promise<string | undefined> {
  return durableget<string>('znsemail')
}

export async function storagewriteznsemail(email: string) {
  return durableupdate('znsemail', () => email)
}

export async function storagereadznstoken(): Promise<string | undefined> {
  return durableget<string>('znstoken')
}

export async function storagewritznstoken(token: string) {
  return durableupdate('znstoken', () => token)
}

export async function storageclearznstoken() {
  await durabledel('znstoken')
}

export async function storagereadznsnamespace(): Promise<string | undefined> {
  const namespace = await durableget<string>('znsnamespace')
  if (!namespace) {
    return undefined
  }
  return znsnormalizenamespace(namespace)
}

export async function storagewriteznsnamespace(namespace: string) {
  return durableupdate('znsnamespace', () => znsnormalizenamespace(namespace))
}

export async function storagereadznssession(): Promise<
  { email: string; token: string; namespace: string } | undefined
> {
  const email = await storagereadznsemail()
  const token = await storagereadznstoken()
  const namespace = await storagereadznsnamespace()
  if (!email || !token || !namespace) {
    return undefined
  }
  return { email, token, namespace }
}

export async function storagewriteznsclear() {
  await durabledel('znsemail')
  await durabledel('znstoken')
  await durabledel('znsnamespace')
}

let currenturlhash = ''
export function storagewatchcontent(player: string) {
  if (isclimode()) {
    return
  }
  globalThis.addEventListener('hashchange', () => {
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

export async function storageshorturl(player: string) {
  if (isclimode()) {
    apierror(SOFTWARE, player, 'storage', '#share not supported in server mode')
    return ''
  }

  // unpack short url before sharing
  const urlcontent = await storagereadcontent(player)
  if (isarray(urlcontent)) {
    apierror(SOFTWARE, player, 'storage', '#share not supported in server mode')
    return ''
  }

  // share full content
  const shareurl = new URL(location.href)
  shareurl.hash = urlcontent

  // gen global shorturl
  return await shorturl(shareurl.href)
}

export async function storagesharecontent(player: string) {
  if (isclimode()) {
    apierror(SOFTWARE, player, 'storage', '#share not supported in server mode')
    return
  }

  // gen global shorturl
  workstatus(SOFTWARE, player, 'share url')
  const url = await storageshorturl(player)
  writecopyit(SOFTWARE, player, url, url)
}

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
export function storagenukecontent(_player: string) {
  if (isclimode()) {
    const g = globalThis as { __nodeStorageNukeContent?: () => void }
    if (typeof g.__nodeStorageNukeContent === 'function') {
      g.__nodeStorageNukeContent()
    }
    return
  }
  // nuke is the only valid case for reload
  location.hash = ''
  currenturlhash = location.hash
  location.reload()
}
