/** CORS proxy for third-party HTTPS fetches. API reference: infra/README.md#brick-net-brick-workerjs */

function base64urldecode(input) {
  let b64 = input.replace(/-/g, '+').replace(/_/g, '/')
  while (b64.length % 4) {
    b64 += '='
  }
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

function resolvebricktarget(raw) {
  if (!raw) {
    return null
  }
  try {
    const decoded = base64urldecode(raw)
    if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
      return decoded
    }
  } catch {}
  try {
    const legacy = decodeURIComponent(raw)
    if (legacy.startsWith('http://') || legacy.startsWith('https://')) {
      return legacy
    }
  } catch {}
  return null
}

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const targetUrl = resolvebricktarget(url.searchParams.get('brick'))

    if (!targetUrl) {
      return new Response('brick not found', { status: 400 })
    }

    // Handle CORS preflight
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
      'Access-Control-Allow-Headers':
        request.headers.get('Access-Control-Request-Headers') || '*',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    try {
      // Proxy the request to the target API
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      })

      // Clone and modify response headers
      const newHeaders = new Headers(response.headers)
      Object.keys(corsHeaders).forEach((key) =>
        newHeaders.set(key, corsHeaders[key]),
      )

      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      })
    } catch (e) {
      return new Response('brick is sad', { status: 500 })
    }
  },
}
