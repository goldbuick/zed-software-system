import { workstatus } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { brickproxiedurl } from 'zss/feature/brickurl'
import { clearqueryparams } from 'zss/feature/deeplink'
import {
  storageclearznstoken,
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

// zns api (https://at.zed.cafe)

export const ZNS_APEX = 'at.zed.cafe'
export const ZNS_TENANT_SUFFIX = 'at.zed.cafe'
export const ZNS_DOCS_NAMESPACE = 'docs'

export const ZNS_PEER_KEY = 'peer'

/** PeerJS topic ids stored under ZNS peer key / join hash. */
export const PEER_ID_RE = /^[a-zA-Z0-9_-]{4,256}$/

export type JOIN_DESTINATION =
  | { kind: 'znspeer'; namespace: string; raw: string }
  | { kind: 'joinhash'; peerid: string; raw: string }

/**
 * Parse a board exit / #goto address as a join destination.
 * Accepts `wil.at.zed.cafe/peer`, `https://…/peer`, and `/join/#{peerId}` URLs.
 */
export function parsejoindestination(
  raw: string,
): JOIN_DESTINATION | undefined {
  const trimmed = `${raw ?? ''}`.trim()
  if (!trimmed) {
    return undefined
  }

  let urlstr = trimmed
  if (!/^https?:\/\//i.test(urlstr)) {
    if (!urlstr.includes('.') && !urlstr.includes('/join')) {
      return undefined
    }
    urlstr = `https://${urlstr.replace(/^\/+/, '')}`
  }

  try {
    const u = new URL(urlstr)
    const pathname = u.pathname.replace(/\/+$/, '') || '/'
    if (pathname === '/join' || pathname.endsWith('/join')) {
      const peerid = u.hash.replace(/^#/, '').trim()
      if (PEER_ID_RE.test(peerid)) {
        return { kind: 'joinhash', peerid, raw: trimmed }
      }
      return undefined
    }

    const host = u.hostname.toLowerCase()
    const suffix = `.${ZNS_TENANT_SUFFIX}`
    if (!host.endsWith(suffix)) {
      return undefined
    }
    const namespace = host.slice(0, -suffix.length)
    if (!namespace || !ZNS_LOGIN_NAMESPACE_RE.test(namespace)) {
      return undefined
    }
    const key = pathname.replace(/^\//, '').split('/')[0] ?? ''
    if (key !== ZNS_PEER_KEY) {
      return undefined
    }
    return { kind: 'znspeer', namespace, raw: trimmed }
  } catch {
    return undefined
  }
}

export function isjoindestination(raw: string): boolean {
  return parsejoindestination(raw) !== undefined
}

export const BYTES_ORIGIN_HOST = 'bytes.zed.cafe'
/** Short keys from net-bytes worker / ZNS bytes values. */
export const BYTES_KEY_RE = /^[A-Za-z0-9]{4,96}$/

export type CONTENT_DESTINATION = {
  kind: 'bytes'
  key: string
  raw: string
}

/**
 * Parse a board exit / #goto address as shared content (bytes short URL).
 * Accepts `bytes.zed.cafe/<key>` and `https://bytes.zed.cafe/<key>`.
 */
export function parsecontentdestination(
  raw: string,
): CONTENT_DESTINATION | undefined {
  const trimmed = `${raw ?? ''}`.trim()
  if (!trimmed) {
    return undefined
  }

  let urlstr = trimmed
  if (!/^https?:\/\//i.test(urlstr)) {
    if (!urlstr.toLowerCase().includes(BYTES_ORIGIN_HOST)) {
      return undefined
    }
    urlstr = `https://${urlstr.replace(/^\/+/, '')}`
  }

  try {
    const u = new URL(urlstr)
    if (u.hostname.toLowerCase() !== BYTES_ORIGIN_HOST) {
      return undefined
    }
    const key = u.pathname.replace(/^\/+|\/+$/g, '').split('/')[0] ?? ''
    if (!BYTES_KEY_RE.test(key)) {
      return undefined
    }
    return { kind: 'bytes', key, raw: trimmed }
  } catch {
    return undefined
  }
}

export function iscontentdestination(raw: string): boolean {
  return parsecontentdestination(raw) !== undefined
}

/**
 * Resolve a bytes short URL to its stored cafe redirect target.
 * Bytes GET returns HTML with `location = 'https://zed.cafe/#...'`.
 */
export async function resolvebytesdestination(
  dest: CONTENT_DESTINATION,
): Promise<URL | undefined> {
  const requesturl = `https://${BYTES_ORIGIN_HOST}/${dest.key}`
  try {
    const response = await fetch(requesturl)
    if (!response.ok) {
      return undefined
    }
    const html = await response.text()
    const match = /location\s*=\s*['"]([^'"]+)['"]/i.exec(html)
    const target = match?.[1]?.trim()
    if (!target) {
      return undefined
    }
    return new URL(target)
  } catch {
    return undefined
  }
}

/** True when URL is host content (hash books), not a multiplayer /join/ link. */
export function ishostcontenturl(target: URL): boolean {
  const host = target.hostname.toLowerCase()
  if (host !== 'zed.cafe' && host !== 'localhost' && host !== '127.0.0.1') {
    return false
  }
  const path = target.pathname.replace(/\/+$/, '') || '/'
  if (path === '/join' || path.endsWith('/join')) {
    return false
  }
  const hash = target.hash.replace(/^#/, '').trim()
  return hash.length > 0
}

export const ZNS_LOGIN_CODE_PARAM = 'zns-code'
export const ZNS_LOGIN_EMAIL_PARAM = 'zns-email'
export const ZNS_LOGIN_NAMESPACE_PARAM = 'zns-namespace'

const ZNS_LOGIN_CODE_RE = /^[1-9]{6}$/
const ZNS_LOGIN_NAMESPACE_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/

export type ZNS_LOGIN_URL_PARAMS = {
  code: string
  email?: string
  namespace?: string
}

function readznsloginsearchparams(): URLSearchParams | undefined {
  try {
    return new URLSearchParams(location.search)
  } catch {
    return undefined
  }
}

export function readznsloginparamsfromurl(): ZNS_LOGIN_URL_PARAMS | undefined {
  const search = readznsloginsearchparams()
  if (!search) {
    return undefined
  }
  const code = search.get(ZNS_LOGIN_CODE_PARAM)?.trim()
  if (!code || !ZNS_LOGIN_CODE_RE.test(code)) {
    return undefined
  }
  const emailraw = search.get(ZNS_LOGIN_EMAIL_PARAM)?.trim().toLowerCase()
  const namespaceraw = znsnormalizenamespace(
    search.get(ZNS_LOGIN_NAMESPACE_PARAM) ?? '',
  )
  const params: ZNS_LOGIN_URL_PARAMS = { code }
  if (emailraw?.includes('@')) {
    params.email = emailraw
  }
  if (namespaceraw && ZNS_LOGIN_NAMESPACE_RE.test(namespaceraw)) {
    params.namespace = namespaceraw
  }
  return params
}

export function readznslogincodefromurl(): string | undefined {
  return readznsloginparamsfromurl()?.code
}

export function clearznsloginparamsfromurl(): void {
  clearqueryparams([
    ZNS_LOGIN_CODE_PARAM,
    ZNS_LOGIN_EMAIL_PARAM,
    ZNS_LOGIN_NAMESPACE_PARAM,
  ])
}

export function clearznslogincodefromurl(): void {
  clearznsloginparamsfromurl()
}

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

// export function znsurlforlistrow(
//   namespace: string,
//   key: string,
//   value: string,
//   kind?: string,
// ) {
//   if (key === ZNS_PEER_KEY || kind === 'peer') {
//     return `https://zed.cafe/join/#${value}`
//   }
//   if (kind === 'text') {
//     return znstenanturl(namespace, key)
//   }
//   return `https://bytes.zed.cafe/${value}`
// }

export type ZNS_READ_RESULT = {
  success?: boolean
  key?: string
  value?: string
  metadata?: { kind?: string; updatedAt?: number }
}

export async function znsread(
  namespace: string,
  key: string,
): Promise<ZNS_READ_RESULT> {
  const formdata = new FormData()
  formdata.append('namespace', znsnormalizenamespace(namespace))
  formdata.append('key', key)
  try {
    const request = new Request(`https://${ZNS_APEX}/api/read`, {
      method: 'POST',
      body: formdata,
    })
    const response = await fetch(request)
    const result = await response.json()
    if (!response.ok || !result?.success) {
      return {}
    }
    return result as ZNS_READ_RESULT
  } catch {
    return {}
  }
}

export async function znsisauthed(): Promise<boolean> {
  return !!(await storagereadznssession())
}

async function znscleartokenonforbidden(): Promise<void> {
  lastpublishedpeerid = ''
  await storageclearznstoken()
}

async function znsparsejsonresponse(response: Response): Promise<any> {
  try {
    return await response.json()
  } catch {
    return { success: false }
  }
}

function znsauthtokenpresent(email: string, token: string): boolean {
  return !!email && !!token
}

export async function znsautopublishpeer(peerid: string, player: string) {
  if (!peerid || !PEER_ID_RE.test(peerid)) {
    return
  }
  if (!(await znsisauthed())) {
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
  const ns = znsnormalizenamespace(namespace)
  await storagewriteznsemail(email)
  await storagewriteznsnamespace(ns)
  if (token) {
    await storagewritznstoken(token)
    console.info(`[zns] login ok namespace=${ns} email=${email}`)
    console.info(`[zns] ZNS_TOKEN=${token}`)
    console.info(`[zns] export ZNS_EMAIL=${email} ZNS_TOKEN=${token}`)
  }
}

export async function znspersistlogout() {
  lastpublishedpeerid = ''
  await storagewriteznsclear()
}

export type ZNS_API_RESULT = {
  success?: boolean
  token?: string
  message?: string
}

async function znsparseapiresult(response: Response): Promise<ZNS_API_RESULT> {
  const result = (await response
    .json()
    .catch(() => null)) as ZNS_API_RESULT | null
  if (result && typeof result === 'object') {
    return result
  }
  return { message: `zns http ${response.status}` }
}

export async function znslogin(
  email: string,
  namespace: string,
): Promise<ZNS_API_RESULT> {
  const formdata = new FormData()
  formdata.append('email', email)
  formdata.append('namespace', znsnormalizenamespace(namespace))
  const request = new Request(`https://${ZNS_APEX}/api/login`, {
    method: 'POST',
    body: formdata,
  })
  const response = await fetch(request)
  return znsparseapiresult(response)
}

export async function znslogincode(
  email: string,
  code: string | number,
): Promise<ZNS_API_RESULT> {
  const formdata = new FormData()
  formdata.append('email', email)
  // OTP is always digits; coerce so CLI number tokens still match KV metadata
  formdata.append('code', String(code).trim())
  const request = new Request(`https://${ZNS_APEX}/api/code`, {
    method: 'POST',
    body: formdata,
  })
  const response = await fetch(request)
  return znsparseapiresult(response)
}

export async function znslist(email: string, token: string) {
  if (!znsauthtokenpresent(email, token)) {
    return { success: false }
  }
  const formdata = new FormData()
  formdata.append('email', email)
  formdata.append('token', token)
  const request = new Request(`https://${ZNS_APEX}/api/list`, {
    method: 'POST',
    body: formdata,
  })
  const response = await fetch(request)
  if (response.status === 403) {
    await znscleartokenonforbidden()
    return { success: false }
  }
  return znsparsejsonresponse(response)
}

export async function znsset(
  email: string,
  token: string,
  key: string,
  value: string,
) {
  if (!znsauthtokenpresent(email, token)) {
    return { success: false }
  }
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
  if (response.status === 403) {
    await znscleartokenonforbidden()
    return { success: false }
  }
  return znsparsejsonresponse(response)
}

export async function znsdelete(email: string, token: string, key: string) {
  if (!znsauthtokenpresent(email, token)) {
    return { success: false }
  }
  const formdata = new FormData()
  formdata.append('email', email)
  formdata.append('token', token)
  formdata.append('key', key)
  const request = new Request(`https://${ZNS_APEX}/api/delete`, {
    method: 'POST',
    body: formdata,
  })
  const response = await fetch(request)
  if (response.status === 403) {
    await znscleartokenonforbidden()
    return { success: false }
  }
  return znsparsejsonresponse(response)
}
