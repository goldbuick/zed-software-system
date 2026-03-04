#!/usr/bin/env node
/**
 * Build the headless CLI for standalone distribution.
 * 1. Bundles server/cli.tsx with esbuild (resolves TS, path aliases, deps)
 * 2. Outputs dist-cli/cli.cjs for pkg.
 *
 * Prerequisites: yarn build (cafe/dist must exist)
 * Assets for pkg: cafe/dist/**, server/stub-book.json
 */
import * as esbuild from 'esbuild'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

async function buildCli() {
  const distDir = path.join(root, 'cafe', 'dist')
  if (!fs.existsSync(distDir)) {
    console.error('cafe/dist not found. Run: yarn build')
    process.exit(1)
  }

  const outDir = path.join(root, 'dist-cli')
  fs.mkdirSync(outDir, { recursive: true })

  await esbuild.build({
    entryPoints: [path.join(root, 'server', 'cli.tsx')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    outfile: path.join(outDir, 'cli.mjs'),
    external: [
      'playwright', // native bindings, pkg will include from node_modules
      'react-devtools-core', // optional ink dev dependency
    ],
    alias: {
      'zss/words/cp437': path.join(root, 'zss', 'words', 'cp437.ts'),
    },
    loader: { '.ts': 'ts', '.tsx': 'tsx' },
    logLevel: 'info',
  })

  console.log('CLI bundle written to dist-cli/cli.mjs')
}

buildCli().catch((err) => {
  console.error(err)
  process.exit(1)
})
