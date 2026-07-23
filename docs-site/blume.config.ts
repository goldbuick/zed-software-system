import { defineConfig } from 'blume'

export default defineConfig({
  title: 'ZSS System Reference',
  description:
    'Architecture, glossary, and developer docs for Zed Cafe / Zed Software System.',
  github: {
    owner: 'goldbuick',
    repo: 'zed-software-system',
    branch: 'main',
    dir: 'docs-site',
  },
  // Zed Cafe / ZNS VGA aesthetic (see theme.css + ops/infra/net-zns-worker.js).
  theme: {
    mode: 'dark',
    radius: 'none',
    accent: {
      light: '#00aaaa',
      dark: '#55ffff',
    },
    // Per-mode action colors live in theme.css (--blume-action).
    action: '#55ff55',
    background: {
      light: '#e8eefc',
      dark: '#0000aa',
    },
    fonts: {
      // Curated fallbacks; theme.css swaps in IBM EGA 8x14.
      display: 'space-mono',
      body: 'space-mono',
      mono: 'space-mono',
    },
  },
  content: {
    // Single filesystem root: colocated zss/**/docs and ops/docs are symlinked
    // under content/<prefix>/ so Blume entry ids match the Astro collection base.
    // Ops mount is the full ops/docs dir; exclude generated / tooling / archival:
    // tasks.md, markdown-link-check.json, wip-intent-*.
    root: 'content',
    include: ['**/*.{md,mdx}'],
    exclude: [
      '**/_*',
      '**/.*',
      '**/tasks.md',
      '**/markdown-link-check.json',
      '**/wip-intent-*',
    ],
  },
  search: {
    provider: 'orama',
  },
  ai: {
    llmsTxt: true,
  },
  deployment: {
    output: 'static',
    site: 'https://zed.cafe',
    base: '/docs',
  },
})
