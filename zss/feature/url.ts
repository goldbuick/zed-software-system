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

// brick proxy: museum API + images use BRICK_BASE/?brick=<full upstream https URL>

export const BRICK_BASE = 'https://brick.zed.cafe'

/** Load remote http(s) images via brick `?brick=`; brick decodes with decodeURIComponent once. */
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
  return `${BRICK_BASE}/?brick=${encodeURIComponent(absolute)}`
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
  const target = `${MUSEUMOFZZT_URL_BASE}/zgames/${content}`
  const response = await fetch(brickproxiedurl(target))
  const zipdata = await response.arrayBuffer()
  const file = new File([zipdata], content)
  parsewebfile(player, file)
}

// bbs api

export async function bbslogin(email: string, tag: string) {
  const formData = new FormData()
  formData.append('email', email)
  formData.append('tag', tag)
  const request = new Request('https://bbs.zed.cafe/api/login', {
    method: 'POST',
    body: formData,
  })
  const response = await fetch(request)
  const result = await response.json()
  return result
}

export async function bbslogincode(email: string, code: string) {
  const formData = new FormData()
  formData.append('email', email)
  formData.append('code', code)
  const request = new Request('https://bbs.zed.cafe/api/code', {
    method: 'POST',
    body: formData,
  })
  const response = await fetch(request)
  const result = await response.json()
  return result
}

export async function bbslist(email: string, code: string) {
  const formData = new FormData()
  formData.append('email', email)
  formData.append('code', code)
  const request = new Request('https://bbs.zed.cafe/api/list', {
    method: 'POST',
    body: formData,
  })
  const response = await fetch(request)
  const result = await response.json()
  return result
}

export async function bbspublish(
  email: string,
  code: string,
  filename: string,
  url: string,
  tags: string[],
) {
  const formData = new FormData()
  formData.append('email', email)
  formData.append('code', code)
  formData.append('filename', filename)
  formData.append('url', url)
  formData.append('tags', tags.join(','))
  const request = new Request('https://bbs.zed.cafe/api/publish', {
    method: 'POST',
    body: formData,
  })
  const response = await fetch(request)
  const result = await response.json()
  return result
}

export async function bbsdelete(email: string, code: string, filename: string) {
  const formData = new FormData()
  formData.append('email', email)
  formData.append('code', code)
  formData.append('filename', filename)
  const request = new Request('https://bbs.zed.cafe/api/delete', {
    method: 'POST',
    body: formData,
  })
  const response = await fetch(request)
  const result = await response.json()
  return result
}
