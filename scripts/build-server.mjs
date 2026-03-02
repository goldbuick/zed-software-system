#!/usr/bin/env node
/**
 * Bundle the ZSS server for standalone distribution.
 * Produces dist-server/server.js, simspace.js, heavyspace.js for pkg.
 */
import * as esbuild from 'esbuild'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outDir = path.join(root, 'dist-server')

const shared = {
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  sourcemap: false,
  bundle: true,
  minify: false,
  external: [
    'onnxruntime-node',
    '@huggingface/transformers',
    'source-map',
    '@roamhq/wrtc',
  ],
  alias: {
    'zss/feature/storage': path.join(root, 'zss/feature/storage-server.ts'),
    'maath/misc': path.join(root, 'zss/server/stubs/maath-misc.ts'),
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
}

async function build() {
  await Promise.all([
    esbuild.build({
      ...shared,
      entryPoints: [path.join(root, 'zss/server/main.tsx')],
      outfile: path.join(outDir, 'server.cjs'),
    }),
    esbuild.build({
      ...shared,
      entryPoints: [path.join(root, 'zss/server/simspace.fork.ts')],
      outfile: path.join(outDir, 'simspace.cjs'),
    }),
    esbuild.build({
      ...shared,
      entryPoints: [path.join(root, 'zss/server/heavyspace.fork.ts')],
      outfile: path.join(outDir, 'heavyspace.cjs'),
    }),
  ])
  console.log('Server bundles written to dist-server/')
}

build().catch((err) => {
  console.error(err)
  process.exit(1)
})
