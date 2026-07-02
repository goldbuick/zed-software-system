import fs from 'node:fs'
import type http from 'node:http'
import path from 'node:path'

const MIMES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.wav': 'audio/wav',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
}

/** Lets same-origin parity host load in iframes under the app COEP require-corp. */
const COEP_IFRAME_HTML_HEADERS: Record<string, string> = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin',
}

const PARITY_BLANK_HOST_PATH = '/parity-host'
const PARITY_BLANK_HOST_HTML =
  '<!doctype html><html><head><meta charset="UTF-8"></head><body></body></html>'

function applycoepiframehtmlheaders(
  res: http.ServerResponse,
  filepath: string,
) {
  if (path.extname(filepath).toLowerCase() !== '.html') {
    return
  }
  for (const [key, value] of Object.entries(COEP_IFRAME_HTML_HEADERS)) {
    res.setHeader(key, value)
  }
}

function contenttype(filepath: string): string | undefined {
  return MIMES[path.extname(filepath).toLowerCase()]
}

/** Serve files under rootdir at /{prefix}/… (dev + parity Playwright only). */
export function fixtureprefixmiddleware(
  prefix: string,
  rootdir: string,
): http.RequestListener {
  const prefixwithslash = prefix.endsWith('/') ? prefix : `${prefix}/`
  return (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next()
      return
    }
    const pathname = (req.url ?? '').split('?')[0]
    if (!pathname.startsWith(prefixwithslash)) {
      next()
      return
    }
    const rel = pathname.slice(prefixwithslash.length)
    if (!rel || rel.includes('..')) {
      next()
      return
    }
    const file = path.join(rootdir, rel)
    const resolved = path.resolve(file)
    if (
      !resolved.startsWith(path.resolve(rootdir)) ||
      !fs.existsSync(resolved)
    ) {
      next()
      return
    }
    const stat = fs.statSync(resolved)
    if (!stat.isFile()) {
      next()
      return
    }
    const type = contenttype(resolved)
    if (type) {
      res.setHeader('Content-Type', type)
    }
    applycoepiframehtmlheaders(res, resolved)
    if (req.method === 'HEAD') {
      res.statusCode = 200
      res.end()
      return
    }
    fs.createReadStream(resolved).pipe(res)
  }
}

/** Inline blank COEP host for Playwright page.evaluate (no committed HTML file). */
export function parityblankhostmiddleware(): http.RequestListener {
  return (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next()
      return
    }
    const pathname = (req.url ?? '').split('?')[0]
    if (pathname !== PARITY_BLANK_HOST_PATH) {
      next()
      return
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    for (const [key, value] of Object.entries(COEP_IFRAME_HTML_HEADERS)) {
      res.setHeader(key, value)
    }
    if (req.method === 'HEAD') {
      res.statusCode = 200
      res.end()
      return
    }
    res.statusCode = 200
    res.end(PARITY_BLANK_HOST_HTML)
  }
}
