#!/usr/bin/env node
/**
 * Bundle the ZSS server for standalone distribution.
 * Uses Vite (vite.server.config.ts). Produces dist-server/server.cjs, simspace.cjs, heavyspace.cjs for pkg.
 *
 * Override pattern: storage, register, netterminal resolve to server implementations.
 */
import { build } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

async function buildServer() {
  const configPath = path.join(root, 'vite.server.config.ts')
  await build({
    configFile: configPath,
    logLevel: 'info',
  })
  console.log('Server bundles written to dist-server/')
}

buildServer().catch((err) => {
  console.error(err)
  process.exit(1)
})
