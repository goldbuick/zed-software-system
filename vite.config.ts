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
      ...(nohttps ? [] : [mkcert()]),
      ...(hmronly ? [] : [fullreload(['**/*.ts', '**/*.tsx'])]),
      ...(useanalyzer ? [analyzer()] : []),
    ],
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
