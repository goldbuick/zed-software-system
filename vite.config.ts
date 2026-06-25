import { execSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'path'

import react from '@vitejs/plugin-react-swc'
import { type Plugin, defineConfig, loadEnv } from 'vite'
import { analyzer } from 'vite-bundle-analyzer'
import fullreload from 'vite-plugin-full-reload'
import mkcert from 'vite-plugin-mkcert'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

import {
  PUBLIC_FIXTURES_DIR,
  RENDERS_FIXTURES_DIR,
} from './ops/lib/fixturepaths.ts'
import pkg from './package.json'
import {
  fixtureprefixmiddleware,
  harnesshtmlmiddleware,
} from './tasks/lib/parity/harness-middleware.ts'

/**
 * Firefox refuses module scripts when Content-Type is missing (""). Some dev
 * responses for `/@fs/.../.vite/deps/*.js` and `/wasm/daisy/*.js` worklets can
 * end up without a MIME; set it before the response is sent.
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
              url.includes('/@fs/') ||
              url.includes('/wasm/daisy/')) &&
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

/** @bokuweb/zstd-wasm ships .map files referencing unpublished lib/*.ts sources. */
function stripzstdsourcemaprefs(): Plugin {
  return {
    name: 'strip-zstd-sourcemap-refs',
    apply: 'serve',
    enforce: 'pre',
    async load(id) {
      const filepath = id.split('?')[0]
      if (
        !filepath.includes('@bokuweb/zstd-wasm') ||
        !filepath.endsWith('.js') ||
        !path.isAbsolute(filepath)
      ) {
        return
      }
      const code = await readFile(filepath, 'utf-8')
      if (!code.includes('sourceMappingURL')) {
        return { code, map: { mappings: '' } }
      }
      return {
        code: code.replace(/\n?\/\/# sourceMappingURL=.*$/gm, ''),
        map: { mappings: '' },
      }
    },
  }
}

function servefixturesdev(): Plugin {
  const root = process.cwd()
  return {
    name: 'serve-fixtures-dev',
    apply: 'serve',
    configureServer(server) {
      // Register during setup (not in the post hook) so these run before Vite's SPA fallback.
      server.middlewares.use(harnesshtmlmiddleware())
      server.middlewares.use(
        fixtureprefixmiddleware('/fixtures', PUBLIC_FIXTURES_DIR),
      )
      server.middlewares.use(
        fixtureprefixmiddleware('/renders', RENDERS_FIXTURES_DIR),
      )
      server.middlewares.use(
        fixtureprefixmiddleware('/ops/lib', path.join(root, 'ops/lib')),
      )
      server.middlewares.use(
        fixtureprefixmiddleware('/ops/archive', path.join(root, 'ops/archive')),
      )
      server.middlewares.use(
        fixtureprefixmiddleware(
          '/ops/fixtures',
          path.join(root, 'ops/fixtures'),
        ),
      )
      server.middlewares.use(
        fixtureprefixmiddleware(
          '/wasm/archive/maximilian',
          path.join(root, 'ops/archive/wasm/maximilian'),
        ),
      )
      server.middlewares.use(
        fixtureprefixmiddleware(
          '/wanix',
          path.join(root, 'ops/fixtures/harness/wanix'),
        ),
      )
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const envprefix = 'ZSS_'
  const root = path.join('cafe')
  const apppath = path.join(process.cwd(), root)

  // Load app-level env vars to node-level env vars.
  const loadedenv = loadEnv(mode, apppath, envprefix)
  process.env = {
    ...loadedenv,
    ...process.env,
    ZSS_BRANCH_NAME: execSync('git rev-parse --abbrev-ref HEAD')
      .toString()
      .trimEnd(),
    ZSS_BRANCH_VERSION: pkg.version,
    ZSS_COMMIT_HASH: execSync('git rev-parse HEAD').toString().trimEnd(),
    ZSS_COMMIT_MESSAGE: execSync('git show -s --format=%s')
      .toString()
      .trimEnd(),
  }

  const nohttps = !!JSON.parse(process.env.ZSS_NO_HTTPS ?? 'false')
  const hmronly = !!JSON.parse(process.env.ZSS_HMR_ONLY ?? 'false')
  const useanalyzer = !!JSON.parse(process.env.ZSS_ANALYZER ?? 'false')
  const usewasmheaders = true
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
  const zssenvfallback = (key: (typeof zssprocessenvkeys)[number]): string => {
    if (
      key === 'ZSS_DEBUG_TRACE_CODE' ||
      key === 'ZSS_BRANCH_NAME' ||
      key === 'ZSS_BRANCH_VERSION' ||
      key === 'ZSS_COMMIT_MESSAGE'
    ) {
      return ''
    }
    return 'false'
  }
  const zssdefine = Object.fromEntries(
    zssprocessenvkeys.map((key) => {
      return [
        `process.env.${key}`,
        JSON.stringify(process.env[key] ?? zssenvfallback(key)),
      ] as const
    }),
  )

  return {
    root,
    envPrefix: envprefix,
    worker: {
      format: 'es',
    },
    build: {
      rollupOptions: {
        input: {
          index: path.join(apppath, 'index.html'),
          sys: path.join(apppath, 'sys/index.html'),
          'wanix-iframe-host': path.join(apppath, 'wanix-iframe-host.html'),
        },
      },
    },
    plugins: [
      devjavascriptmimetypedev(),
      stripzstdsourcemaprefs(),
      servefixturesdev(),
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
      'import.meta.env.ZSS_DAISY_PERF': JSON.stringify(
        process.env.ZSS_DAISY_PERF ?? '',
      ),
      'import.meta.env.ZSS_DAISY_PARITY': JSON.stringify(
        process.env.ZSS_DAISY_PARITY ?? '',
      ),
      'import.meta.env.ZSS_DAISY_NO_SIDECHAIN': JSON.stringify(
        process.env.ZSS_DAISY_NO_SIDECHAIN ?? '',
      ),
      'import.meta.env.ZSS_DAISY_NO_MAIN_COMP': JSON.stringify(
        process.env.ZSS_DAISY_NO_MAIN_COMP ?? '',
      ),
      'import.meta.env.ZSS_COMMIT_HASH': JSON.stringify(
        process.env.ZSS_COMMIT_HASH ?? '',
      ),
    },
    resolve: {
      alias: {
        zss: path.resolve(__dirname, './zss'),
        cafe: path.resolve(__dirname, './cafe'),
        'ops/fixtures': path.resolve(__dirname, './ops/fixtures'),
        'ops/lib': path.resolve(__dirname, './ops/lib'),
        'ops/archive': path.resolve(__dirname, './ops/archive'),
        'ops/lib/test': path.resolve(__dirname, './ops/lib/test'),
      },
    },
    optimizeDeps: {
      exclude: ['@bokuweb/zstd-wasm'],
      esbuildOptions: {
        target: 'es2020',
      },
    },
    server: {
      headers: usewasmheaders
        ? {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
          }
        : undefined,
    },
  }
})
