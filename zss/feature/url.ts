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

// bridge api

export type MOSTLY_ZZT_META = {
  title: string
  letter: string
  author: string[]
  genres: string[]
  filename: string
  screenshot: string
  publish_date: string
}

const BRIDGE_URL = `https://bridge.zed.cafe`

export async function museumofzztsearch(
  field: string,
  text: string,
  offset: number,
): Promise<MOSTLY_ZZT_META[]> {
  const searchargs = `offset=${offset}&${field}=${text}`
  const request = new Request(
    `${BRIDGE_URL}/api/v1/search/files/?${searchargs}`,
  )
  const response = await fetch(request)
  const contentjson = await response.json()
  const contentlist = contentjson.data.results as MOSTLY_ZZT_META[]
  return contentlist
}

export async function museumofzztrandom(): Promise<MOSTLY_ZZT_META[]> {
  const request = new Request(`${BRIDGE_URL}/api/v1/get/random-file/`)
  const response = await fetch(request)
  const contentjson = await response.json()
  const contentdata = contentjson.data
  return [contentdata] as MOSTLY_ZZT_META[]
}

export function museumofzztscreenshoturl(content: string) {
  return `${BRIDGE_URL}/static/${content}`
}

export async function museumofzztdownload(
  player: string,
  content: string,
): Promise<void> {
  const response = await fetch(`${BRIDGE_URL}/zgames/${content}`)
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
  for (let i = 0; i < tags.length; ++i) {
    formData.append('tags', tags[i])
  }
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
