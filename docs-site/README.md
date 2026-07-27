# docs-site

Blume static docs for **https://zed.cafe/docs/** (ZSS System Reference).

## Layout

| Path | Role |
|------|------|
| `blume.config.ts` | Site title, `deployment.base: "/docs"`, search, `llmsTxt`, **theme** (ZNS/EGA) |
| `theme.css` | Zed Cafe / ZNS tokens — terminal blue, cyan accent, IBM EGA, dot backplate |
| `public/fonts/IBMEGA8x14.woff` | Bitmap font from `ops/infra/zns-public/fonts/` |
| `public/zns-dot-tile.svg` | Checkerboard blue-on-blue dots (tape / ZNS backplate) |
| `content/` | Spine pages (intro, map, glossary, features, architecture) — real files |
| `content/<prefix>/` | Symlinks into colocated `zss/**/docs` (and `ops` → `ops/docs`) |

Examples: `content/lang` → `zss/feature/lang/docs`, `content/device` → `zss/device/docs`.

Theme inspiration: [`ops/infra/net-zns-worker.js`](../ops/infra/net-zns-worker.js) VGA page (`#0000AA` field, `#55FFFF` brand, IBM EGA 8×14).

Module manuals stay next to code. Do not mass-move them here — see [`.cursor/rules/docs-placement.mdc`](../.cursor/rules/docs-placement.mdc).

`content/ops` mounts the whole `ops/docs` tree. Blume `content.exclude` drops `tasks.md` (generated), `markdown-link-check.json`, and `wip-intent-*` (archival) so they never publish.

## Markdown vs MDX

Plain `.md` is fine for headings, tables, and normal code fences. Blume only renders **Mermaid**, callout directives (`:::note`), math, and `package-install` fences in **`.mdx`**. If a page needs a diagram, name it `*.mdx` (see `content/map.mdx`).

Mermaid diagrams keep their intrinsic width (horizontal scroll in the article) and support **Expand** / click-to-open a fullscreen lightbox via [`components/MermaidZoom.astro`](components/MermaidZoom.astro) (`layout.PageFooter` in [`components.ts`](components.ts)).

## Commands

```bash
yarn task blume dev   # Blume at http://localhost:4321/docs/

# or from docs-site/ (repo-root yarn blume uses the wrong root):
../node_modules/.bin/blume dev
../node_modules/.bin/blume build   # writes docs-site/dist/

# production: Blume + Vite, then merge into cafe/dist/docs/
yarn task run cafe:build
```

No `/sys` redirect — `cafe/sys` was removed.
