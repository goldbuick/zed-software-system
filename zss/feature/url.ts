import { workstatus } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import {
  storagereadznssession,
  storagewriteznsclear,
  storagewriteznsemail,
  storagewriteznsnamespace,
  storagewritznstoken,
} from 'zss/feature/storage'
import { write } from 'zss/feature/writeui'
import { zsstextline } from 'zss/feature/zsstextui'
import { NAME } from 'zss/words/types'

import { parsewebfile } from './parse/file'

// bytes api

export async function shorturl(url: string) {
  const formData = new FormData()
  formData.append('url', url)
  const request = new Request('https://bytes.zed.cafe', {
    method: 'POST',
    body: formData,
  })
  const response = await fetch(request)
  const shortcontent = await response.text()
  // return new bytes url
  return shortcontent
}

// assess what mode we're running in
export function isjoin() {
  return location.href.includes(`/join/`)
}

// brick proxy: museum API + images use BRICK_BASE/?brick=<base64url upstream URL>

export const BRICK_BASE = 'https://brick.zed.cafe'

function base64urlencode(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Load remote http(s) images via brick `?brick=`; brick decodes base64url (legacy percent-encoded URL fallback). */
export function brickproxiedurl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) {
    return trimmed
  }
  if (trimmed.startsWith(`${BRICK_BASE}/`)) {
    return trimmed
  }
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed
  }
  let absolute = trimmed
  if (typeof location !== 'undefined') {
    try {
      absolute = new URL(trimmed, location.href).href
    } catch {
      return trimmed
    }
  }
  let parsed: URL
  try {
    parsed = new URL(absolute)
  } catch {
    return trimmed
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return trimmed
  }
  return `${BRICK_BASE}/?brick=${base64urlencode(absolute)}`
}

/** Upstream Museum of ZZT HTTP URLs; clients reach them only via {@link brickproxiedurl}. */
export const MUSEUMOFZZT_URL_BASE = 'https://museumofzzt.com'

export type MOSTLY_ZZT_META = {
  title: string
  letter: string
  author: string[]
  genres: string[]
  filename: string
  screenshot: string
  publish_date: string
}

export async function museumofzztsearch(
  field: string,
  text: string,
  offset: number,
): Promise<MOSTLY_ZZT_META[]> {
  const searchargs = `offset=${offset}&${field}=${text}`
  const target = `${MUSEUMOFZZT_URL_BASE}/api/v1/search/files/?${searchargs}`
  const request = new Request(brickproxiedurl(target))
  const response = await fetch(request)
  const contentjson = await response.json()
  const contentlist = contentjson.data.results as MOSTLY_ZZT_META[]
  return contentlist
}

export async function museumofzztrandom(): Promise<MOSTLY_ZZT_META[]> {
  const target = `${MUSEUMOFZZT_URL_BASE}/api/v1/get/random-file/`
  const request = new Request(brickproxiedurl(target))
  const response = await fetch(request)
  const contentjson = await response.json()
  const contentdata = contentjson.data
  return [contentdata] as MOSTLY_ZZT_META[]
}

export function museumofzztscreenshoturl(content: string) {
  const target = `${MUSEUMOFZZT_URL_BASE}/static/${content}`
  return brickproxiedurl(target)
}

export async function museumofzztdownload(
  player: string,
  content: string,
): Promise<void> {
  workstatus(SOFTWARE, player, 'zzt fetch')
  const target = `${MUSEUMOFZZT_URL_BASE}/zgames/${content}`
  const response = await fetch(brickproxiedurl(target))
  const zipdata = await response.arrayBuffer()
  const file = new File([zipdata], content)
  parsewebfile(player, file)
}

// zns api (https://zns.zed.cafe)

export const ZNS_APEX = 'zns.zed.cafe'
export const ZNS_TENANT_SUFFIX = 'at.zed.cafe'
export const ZNS_DOCS_NAMESPACE = 'docs'
export const ZNS_PEER_KEY = 'peer'
export const ZNS_BYTES_KEY_TARGET = 'znsbyteskey'

export function znskeyispeer(key: string, kind?: string) {
  return key === ZNS_PEER_KEY || kind === 'peer'
}

export function znskinddisplay(kind?: string, key?: string) {
  if (znskeyispeer(key ?? '', kind)) {
    return 'peer'
  }
  if (kind === 'bytes') {
    return 'bytes'
  }
  if (kind === 'text') {
    return 'code'
  }
  return 'bytes'
}

export function znskeyopenlabel(key: string, value: string, kind?: string) {
  const display = znskinddisplay(kind, key)
  if (display === 'bytes') {
    const short = value.length > 12 ? `${value.slice(0, 8)}…` : value
    return `$blue[bytes] $white${key} $GRAY— ${short}`
  }
  if (display === 'code') {
    return `$blue[code] $white${key} $GRAY— import`
  }
  return `$white${key}`
}

export function znskeylinkcommand(
  namespace: string,
  key: string,
  value: string,
  kind?: string,
) {
  if (znskinddisplay(kind, key) === 'code') {
    return `zns import code ${key}`
  }
  const url = znsurlforlistrow(namespace, key, value, kind)
  return `openit ${url}`
}

const PEER_ID_RE = /^[a-zA-Z0-9_-]{4,256}$/
const ZNS_PATH_KEY_RE = /^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$/

let lastpublishedpeerid = ''

export function znsnormalizenamespace(namespace: string) {
  return (namespace ?? '').toString().trim().toLowerCase()
}

export function znstenanturl(namespace: string, key: string) {
  const ns = znsnormalizenamespace(namespace)
  return `https://${ns}.${ZNS_TENANT_SUFFIX}/${key}`
}

export function znsnormalizepathkey(name: string): string | undefined {
  let slug = NAME(name)
    .toLowerCase()
    .replace(/@/g, '')
    .replace(/[^a-z0-9]+/g, '-')
  slug = slug.replace(/^-+|-+$/g, '')
  if (!slug || !ZNS_PATH_KEY_RE.test(slug)) {
    return undefined
  }
  return slug
}

export function znsurlforlistrow(
  namespace: string,
  key: string,
  value: string,
  kind?: string,
) {
  if (key === ZNS_PEER_KEY || kind === 'peer') {
    return `https://zed.cafe/join/#${value}`
  }
  if (kind === 'text') {
    return znstenanturl(namespace, key)
  }
  return `https://bytes.zed.cafe/${value}`
}

export async function fetchznstext(
  namespace: string,
  key: string,
): Promise<string> {
  const url = znstenanturl(namespace, key)
  const response = await fetch(url)
  if (!response.ok) {
    return ''
  }
  return response.text()
}

export async function znsautopublishpeer(peerid: string, player: string) {
  if (!peerid || !PEER_ID_RE.test(peerid)) {
    return
  }
  const session = await storagereadznssession()
  if (!session) {
    return
  }
  const changed = peerid !== lastpublishedpeerid
  if (!changed) {
    return
  }
  const result = await znsset(
    session.email,
    session.token,
    ZNS_PEER_KEY,
    peerid,
  )
  if (!result?.success) {
    return
  }
  lastpublishedpeerid = peerid
  write(
    SOFTWARE,
    player,
    zsstextline(`$greenpeer id published to zns: ${peerid}`),
  )
}

export async function znspersistlogin(
  email: string,
  namespace: string,
  token?: string,
) {
  await storagewriteznsemail(email)
  await storagewriteznsnamespace(znsnormalizenamespace(namespace))
  if (token) {
    await storagewritznstoken(token)
  }
}

export async function znspersistlogout() {
  lastpublishedpeerid = ''
  await storagewriteznsclear()
}

export async function znslogin(email: string, namespace: string) {
  const formdata = new FormData()
  formdata.append('email', email)
  formdata.append('namespace', znsnormalizenamespace(namespace))
  const request = new Request(`https://${ZNS_APEX}/api/login`, {
    method: 'POST',
    body: formdata,
  })
  const response = await fetch(request)
  const result = await response.json()
  return result
}

export async function znslogincode(email: string, code: string) {
  const formdata = new FormData()
  formdata.append('email', email)
  formdata.append('code', code)
  const request = new Request(`https://${ZNS_APEX}/api/code`, {
    method: 'POST',
    body: formdata,
  })
  const response = await fetch(request)
  const result = await response.json()
  return result
}

export async function znslist(email: string, token: string) {
  const formdata = new FormData()
  formdata.append('email', email)
  formdata.append('token', token)
  const request = new Request(`https://${ZNS_APEX}/api/list`, {
    method: 'POST',
    body: formdata,
  })
  const response = await fetch(request)
  const result = await response.json()
  return result
}

export async function znsset(
  email: string,
  token: string,
  key: string,
  value: string,
) {
  const formdata = new FormData()
  formdata.append('email', email)
  formdata.append('token', token)
  formdata.append('key', key)
  formdata.append('value', value)
  const request = new Request(`https://${ZNS_APEX}/api/set`, {
    method: 'POST',
    body: formdata,
  })
  const response = await fetch(request)
  const result = await response.json()
  return result
}

export async function znsdelete(email: string, token: string, key: string) {
  const formdata = new FormData()
  formdata.append('email', email)
  formdata.append('token', token)
  formdata.append('key', key)
  const request = new Request(`https://${ZNS_APEX}/api/delete`, {
    method: 'POST',
    body: formdata,
  })
  const response = await fetch(request)
  const result = await response.json()
  return result
}
