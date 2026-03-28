import { execSync } from 'node:child_process'
import path from 'path'

import react from '@vitejs/plugin-react-swc'
import { defineConfig, loadEnv } from 'vite'
import { analyzer } from 'vite-bundle-analyzer'
import fullreload from 'vite-plugin-full-reload'
import mkcert from 'vite-plugin-mkcert'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

import pkg from './package.json'

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
    'ZSS_LANG_DEV',
    'ZSS_LANG_TYPES',
    'ZSS_PERF_UI',
    'ZSS_SHOW_CODE',
    'ZSS_TRACE_CODE',
    'ZSS_LOG_DEBUG',
    'ZSS_FORCE_CRT_OFF',
    'ZSS_FORCE_LOW_REZ',
    'ZSS_FORCE_TOUCH_UI',
    'ZSS_BRANCH_NAME',
    'ZSS_BRANCH_VERSION',
    'ZSS_COMMIT_MESSAGE',
  ] as const
  const zssdefine = Object.fromEntries(
    zssprocessenvkeys.map((key) => {
      const fallback =
        key === 'ZSS_TRACE_CODE' ||
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
    define: zssdefine,
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
