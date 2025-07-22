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
  return window.location.href.includes(`/join/`)
}

export function islocked() {
  return window.location.href.includes(`/locked/`)
}

export type MOSTLY_ZZT_META = {
  title: string
  letter: string
  author: string[]
  filename: string
  publish_date: string
  last_modified: string
}

export async function museumofzztsearch(
  field: string,
  text: string,
  offset: number,
): Promise<MOSTLY_ZZT_META[]> {
  const searchargs = `offset=${offset}&${field}=${text}`
  const request = new Request(
    `https://bridge.zed.cafe/api/v1/search/files/?${searchargs}`,
  )
  const response = await fetch(request)
  const contentjson = await response.json()
  const contentlist = contentjson.data.results as MOSTLY_ZZT_META[]
  return contentlist
}

export async function museumofzztrandom(): Promise<MOSTLY_ZZT_META[]> {
  const request = new Request(`https://bridge.zed.cafe/api/v1/get/random-file/`)
  const response = await fetch(request)
  const contentjson = await response.json()
  const contentdata = contentjson.data
  return [contentdata] as MOSTLY_ZZT_META[]
}
