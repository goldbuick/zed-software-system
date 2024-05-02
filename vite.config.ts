import { execSync } from 'node:child_process'
import path from 'path'

import react from '@vitejs/plugin-react-swc'
import { defineConfig, loadEnv } from 'vite'
import arraybuffer from 'vite-plugin-arraybuffer'
import mkcert from 'vite-plugin-mkcert'

import pkg from './package.json'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
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
    ...loadEnv(mode, process.cwd()),
  }

  return {
    root: 'zss/terminal/',
    envPrefix: 'ZSS_',
    plugins: [react(), arraybuffer(), mkcert()],
    resolve: {
      alias: {
        zss: path.resolve(__dirname, './zss'),
      },
    },
  }
})
