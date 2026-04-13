import { execSync } from 'node:child_process'
import path from 'path'

import react from '@vitejs/plugin-react-swc'
import { type Plugin, defineConfig, loadEnv } from 'vite'
import { analyzer } from 'vite-bundle-analyzer'
import fullreload from 'vite-plugin-full-reload'
import mkcert from 'vite-plugin-mkcert'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

import pkg from './package.json'

/**
 * Firefox refuses module scripts when Content-Type is missing (""). Some dev
 * responses for `/@fs/.../.vite/deps/*.js` can end up without a MIME; set it
 * before the response is sent.
 */
function devjavascriptmimetypedev(): Plugin {
  return {
    name: 'dev-javascript-mime',
    apply: 'serve',
    configureServer(server) {
      return () => {
        server.middlewares.use((req, res, next) => {
          const url = req.url ?? ''
          const needstype =
            req.method === 'GET' &&
            (url.includes('/node_modules/.vite/deps') ||
              url.includes('/@fs/')) &&
            /\.js(\?|#|$)/.test(url)
          if (!needstype) {
            return next()
          }
          const origend = res.end.bind(res)
          res.end = function (
            ...args: Parameters<typeof res.end>
          ): ReturnType<typeof res.end> {
            if (!res.headersSent && !res.getHeader('content-type')) {
              res.setHeader(
                'Content-Type',
                'application/javascript; charset=utf-8',
              )
            }
            return origend(...args)
          }
          next()
        })
      }
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const envprefix = 'ZSS_'
  const root = path.join('cafe')
  const apppath = path.join(process.cwd(), root)

  // Load app-level env vars to node-level env vars.
  process.env = {
    ...process.env,
    ZSS_BRANCH_NAME: execSync('git rev-parse --abbrev-ref HEAD')
      .toString()
      .trimEnd(),
    ZSS_BRANCH_VERSION: pkg.version,
    ZSS_COMMIT_HASH: execSync('git rev-parse HEAD').toString().trimEnd(),
    ZSS_COMMIT_MESSAGE: execSync('git show -s --format=%s')
      .toString()
      .trimEnd(),
    ...loadEnv(mode, apppath, envprefix),
  }

  const nohttps = !!JSON.parse(process.env.ZSS_NO_HTTPS ?? 'false')
  const hmronly = !!JSON.parse(process.env.ZSS_HMR_ONLY ?? 'false')
  const useanalyzer = !!JSON.parse(process.env.ZSS_ANALYZER ?? 'false')
  const devHost = process.env.ZSS_DEV_HOST?.trim()
  const mkcertHosts = ['localhost', ...(devHost ? [devHost] : [])]

  const zssprocessenvkeys = [
    'ZSS_DEBUG_LANG_DEV',
    'ZSS_DEBUG_LANG_TYPES',
    'ZSS_DEBUG_PERF_UI',
    'ZSS_DEBUG_SHOW_CODE',
    'ZSS_DEBUG_TRACE_CODE',
    'ZSS_DEBUG_LOG',
    'ZSS_FORCE_CRT_OFF',
    'ZSS_FORCE_LOW_REZ',
    'ZSS_FORCE_TOUCH_UI',
    'ZSS_DEBUG_RAYCAST_DOT',
    'ZSS_DEBUG_RAYCAST_PICKSHEET',
    'ZSS_DEBUG_FLAT_CAMERA_ORTHO',
    'ZSS_BRANCH_NAME',
    'ZSS_BRANCH_VERSION',
    'ZSS_COMMIT_MESSAGE',
  ] as const
  const zssdefine = Object.fromEntries(
    zssprocessenvkeys.map((key) => {
      const fallback =
        key === 'ZSS_DEBUG_TRACE_CODE' ||
        key === 'ZSS_BRANCH_NAME' ||
        key === 'ZSS_BRANCH_VERSION' ||
        key === 'ZSS_COMMIT_MESSAGE'
          ? ''
          : 'false'
      return [
        `process.env.${key}`,
        JSON.stringify(process.env[key] ?? fallback),
      ] as const
    }),
  )

  return {
    root,
    envPrefix: envprefix,
    plugins: [
      devjavascriptmimetypedev(),
      react(),
      nodePolyfills({
        include: ['buffer'],
        globals: {
          global: true,
        },
      }),
      ...(nohttps ? [] : [mkcert({ hosts: mkcertHosts })]),
      ...(hmronly ? [] : [fullreload(['**/*.ts', '**/*.tsx'])]),
      ...(useanalyzer ? [analyzer()] : []),
    ],
    define: {
      ...zssdefine,
      'import.meta.env.ZSS_E2E': JSON.stringify(process.env.ZSS_E2E ?? ''),
    },
    resolve: {
      alias: {
        zss: path.resolve(__dirname, './zss'),
        cafe: path.resolve(__dirname, './cafe'),
      },
    },
    optimizeDeps: {
      exclude: ['@bokuweb/zstd-wasm'],
      esbuildOptions: {
        target: 'es2020',
      },
    },
  }
})
