# Dev-served static assets

Ops-owned assets that need browser URLs without living in `cafe/public/`.

| Subdir | Dev URL | Contents |
|--------|---------|----------|
| `wanix/` | `/fixtures/wanix/` | Drag-drop WASI `.wasm`/`.tgz` + `zedcafe.wasm` staging |
| `renders/` | `/renders/` | Offline Daisy/synth wav/json/txt (parity task output) |
| `books/` | `/fixtures/books/` | Built importable `.book.json` (from `ops/fixtures/content/templates/`) |

Served in dev via `vite.config.ts` (`/fixtures` → this tree; `/renders` → `renders/`).
