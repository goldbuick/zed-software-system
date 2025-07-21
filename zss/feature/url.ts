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

export async function museumofzztsearch(text: string) {
  const request = new Request(
    `https://bridge.zed.cafe/api/v2/zfile/search/?q=${text}`,
  )
  const response = await fetch(request)
  const data = await response.json()
  console.info(data)
}

export async function museumofzztrandom() {
  const request = new Request(`https://bridge.zed.cafe/api/v1/get/random-file/`)
  const response = await fetch(request)
  const data = await response.json()
  console.info(data)
}
