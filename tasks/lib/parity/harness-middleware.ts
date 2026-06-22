import fs from 'node:fs'
import type http from 'node:http'
import path from 'node:path'

const HARNESS_FIXTURES_DIR = path.join(process.cwd(), 'ops/fixtures/harness')

const MIMES: Record<string, string> = {
  '.wav': 'audio/wav',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
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
    if (req.method === 'HEAD') {
      res.statusCode = 200
      res.end()
      return
    }
    fs.createReadStream(resolved).pipe(res)
  }
}

/** Serve ops/fixtures/harness/*.html at /{name}.html (dev + parity Playwright only). */
export function harnesshtmlmiddleware(
  harnessdir = HARNESS_FIXTURES_DIR,
): http.RequestListener {
  return (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next()
      return
    }
    const pathname = (req.url ?? '').split('?')[0]
    if (!pathname.endsWith('.html') || pathname.includes('..')) {
      next()
      return
    }
    const basename = path.basename(pathname)
    const file = path.join(harnessdir, basename)
    if (!file.startsWith(harnessdir) || !fs.existsSync(file)) {
      next()
      return
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    if (req.method === 'HEAD') {
      res.statusCode = 200
      res.end()
      return
    }
    fs.createReadStream(file).pipe(res)
  }
}
