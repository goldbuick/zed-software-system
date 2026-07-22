# docs-site

Blume static docs for **https://zed.cafe/docs/** (ZSS System Reference).

## Layout

| Path | Role |
|------|------|
| `blume.config.ts` | Site title, `deployment.base: "/docs"`, search, `llmsTxt`, content exclude globs |
| `content/` | Spine pages (intro, map, glossary, features, architecture) — real files |
| `content/<prefix>/` | Symlinks into colocated `zss/**/docs` (and `ops` → `ops/docs`) |

Module manuals stay next to code. Do not mass-move them here — see [`.cursor/rules/docs-placement.mdc`](../.cursor/rules/docs-placement.mdc).

`content/ops` mounts the whole `ops/docs` tree. Blume `content.exclude` drops `tasks.md` (generated), `markdown-link-check.json`, and `wip-intent-*` (archival) so they never publish.

## Commands

Run Blume with `docs-site/` as cwd (repo-root `yarn blume` uses the wrong root and looks for a default `docs/` folder):

```bash
# from docs-site/
../node_modules/.bin/blume dev
../node_modules/.bin/blume build   # writes docs-site/dist/

# production: Blume + Vite, then merge into cafe/dist/docs/
yarn task run cafe:build
```

No separate citty task id for docs. No `/sys` redirect — `cafe/sys` was removed.
