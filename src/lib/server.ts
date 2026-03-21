import fs from 'fs'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Root directory (project root when running from dist). */
export function getroot(): string {
  return path.join(__dirname, '..', '..', '..')
}

/** Create static file server for cafe/dist. */
export function createstaticserver(
  distDir: string,
  port: number,
): Promise<ReturnType<typeof createServer>> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let urlPath = req.url === '/' ? '/index.html' : (req.url ?? '/')
      urlPath = urlPath.split('?')[0]
      const filePath = path.join(distDir, urlPath)
      if (!filePath.startsWith(distDir)) {
        res.writeHead(403)
        res.end()
        return
      }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          if (err.code === 'ENOENT') {
            fs.readFile(path.join(distDir, 'index.html'), (e, fallback) => {
              if (e) {
                res.writeHead(404)
                res.end()
                return
              }
              res.writeHead(200, { 'Content-Type': 'text/html' })
              res.end(fallback)
            })
          } else {
            res.writeHead(500)
            res.end()
          }
          return
        }
        const ext = path.extname(filePath)
        const types: Record<string, string> = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.ico': 'image/x-icon',
          '.wasm': 'application/wasm',
          '.webmanifest': 'application/manifest+json',
        }
        res.writeHead(200, {
          'Content-Type': types[ext] || 'application/octet-stream',
        })
        res.end(data)
      })
    })
    server.listen(port, () => resolve(server))
  })
}
