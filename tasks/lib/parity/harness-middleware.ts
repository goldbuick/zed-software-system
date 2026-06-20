import fs from 'node:fs'
import path from 'node:path'
import type http from 'node:http'

import { HARNESS_FIXTURES_DIR } from 'zss/testsupport/fixturepaths'

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
