/**
 * Minimal Vite server for offline parity renders (no HMR client, no full app config).
 */
import http from 'node:http'
import path from 'node:path'

import { RENDERS_FIXTURES_DIR } from 'ops/lib/fixturepaths'
import { createServer as createViteServer } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

import {
  fixtureprefixmiddleware,
  harnesshtmlmiddleware,
} from './harness-middleware.ts'

export const PARITY_SERVER_PORT = 9877

export async function startparityvite(
  projectroot: string,
  port = PARITY_SERVER_PORT,
) {
  const vite = await createViteServer({
    configFile: false,
    root: projectroot,
    publicDir: path.join(projectroot, 'cafe/public'),
    plugins: [nodePolyfills()],
    resolve: {
      alias: {
        zss: path.join(projectroot, 'zss'),
        cafe: path.join(projectroot, 'cafe'),
      },
    },
    server: {
      middlewareMode: true,
      hmr: false,
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
    appType: 'spa',
    optimizeDeps: {
      include: ['tonal'],
    },
  })

  const server = http.createServer((req, res) => {
    harnesshtmlmiddleware()(req, res, () => {
      fixtureprefixmiddleware('/renders', RENDERS_FIXTURES_DIR)(
        req,
        res,
        () => {
          vite.middlewares.handle(req, res, () => {
            res.statusCode = 404
            res.end('not found')
          })
        },
      )
    })
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', resolve)
  })

  return { server, vite, port }
}

export async function stopparityvite(handle: {
  server: import('node:http').Server
  vite: Awaited<ReturnType<typeof createViteServer>>
}) {
  await new Promise<void>((resolve, reject) => {
    handle.server.close((err) => {
      if (err) {
        reject(err)
        return
      }
      resolve()
    })
  })
  await handle.vite.close()
}
