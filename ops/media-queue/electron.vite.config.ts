import { resolve } from 'node:path'

import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

/**
 * Renderer keeps its existing `ui/` root so index.html, css, and fonts stay
 * next to the entry. publicDir is ui/vendor so PeerJS (classic script tag) is
 * served in dev and copied into out/renderer on build. Main and preload follow
 * the electron-vite layout and emit CommonJS, which the sandboxed preload
 * requires.
 */
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/index.ts') },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/preload/index.ts') },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'ui'),
    publicDir: resolve(__dirname, 'ui/vendor'),
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'ui/index.html') },
      },
    },
  },
})
