# Dev-served static assets

Ops-owned assets that need browser URLs without living in `cafe/public/`.

| Subdir | Dev URL | Contents |
|--------|---------|----------|
| `renders/` | `/renders/` | Offline Daisy/synth wav/json/txt (parity task output) |
| `books/` | `/fixtures/books/` | Built importable `.book.json` (from `ops/fixtures/content/templates/`) |
| `fonts/` | (drop into cafe) | PETSCII 8×14 `.chr` charsets for zed.cafe import |

Served in dev via `vite.config.ts` (`/fixtures` → this tree; `/renders` → `renders/`).
