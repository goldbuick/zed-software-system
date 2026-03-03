/**
 * Vite config for server build (Node.js).
 * Produces dist-server/server.cjs, simspace.cjs, heavyspace.cjs for pkg.
 * Uses override pattern: storage, register, netterminal resolve to server implementations.
 */
import path from 'path'

import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

const root = path.resolve(__dirname)
const zss = path.join(root, 'zss')

export default defineConfig({
  root,
  ssr: {
    noExternal: ['json-joy'], // bundle json-joy (avoids Node ESM resolution of its extensionless re-exports)
  },
  build: {
    ssr: true, // target Node, don't externalize node: builtins
    outDir: 'dist-server',
    emptyOutDir: true,
    target: 'node20',
    minify: false,
    sourcemap: false,
    lib: {
      entry: {
        server: 'zss/server/main.tsx',
        simspace: 'zss/server/simspace.fork.ts',
        heavyspace: 'zss/server/heavyspace.fork.ts',
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [
        'onnxruntime-node',
        '@huggingface/transformers',
        'source-map',
        '@roamhq/wrtc',
      ],
      output: {
        format: 'es',
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  plugins: [react()],
  resolve: {
    alias: [
      // Server overrides first (most specific - exact match before zss prefix)
      {
        find: 'zss/device/register',
        replacement: path.join(zss, 'device/rackregister.ts'),
      },
      {
        find: 'zss/feature/storage',
        replacement: path.join(zss, 'feature/storage-server.ts'),
      },
      {
        find: 'zss/feature/netterminal',
        replacement: path.join(zss, 'feature/netterminal-server.ts'),
      },
      {
        find: 'maath/misc',
        replacement: path.join(zss, 'server/stubs/maath-misc.ts'),
      },
      { find: 'zss', replacement: zss },
      { find: 'cafe', replacement: path.join(root, 'cafe') },
    ],
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
})
