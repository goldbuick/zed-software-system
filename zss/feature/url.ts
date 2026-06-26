import { workstatus } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { clearqueryparams } from 'zss/feature/deeplink'
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

import { brickproxiedurl } from 'zss/feature/brickurl'

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
