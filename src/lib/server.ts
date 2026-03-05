import fs from 'fs'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Root directory (project root when running from dist). */
export function getRoot(): string {
  return path.join(__dirname, '..', '..', '..')
}

/** Resolve path to Chromium headless shell from playwright install. */
export function getBundledChromiumPath(root: string): string | null {
  const browsersDir = path.join(
    root,
    'node_modules',
    'playwright-core',
    '.local-browsers',
  )
  if (!fs.existsSync(browsersDir)) {
    return null
  }
  const entries = fs.readdirSync(browsersDir)
  const shellDir = entries.find((e) => e.startsWith('chromium_headless_shell-'))
  if (!shellDir) {
    return null
  }
  const platform =
    process.platform === 'darwin'
      ? process.arch === 'arm64'
        ? 'chrome-headless-shell-mac-arm64'
        : 'chrome-headless-shell-mac-x64'
      : process.platform === 'win32'
        ? 'chrome-headless-shell-win64'
        : `chrome-headless-shell-linux-${process.arch}`
  const exeName =
    process.platform === 'win32'
      ? 'chrome-headless-shell.exe'
      : 'chrome-headless-shell'
  const exePath = path.join(browsersDir, shellDir, platform, exeName)
  return fs.existsSync(exePath) ? exePath : null
}

/** Create static file server for cafe/dist. */
export function createStaticServer(
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
