# wanixtour

Boards + scrolls for the Wanix feature tour. Terrain kinds come from
coolregionsbow; this book adds tour boards and `@scroll wanixnotes`.

## Prerequisites

1. Import [`ops/fixtures/books/example-coolregionsbow.book.json`](../../books/example-coolregionsbow.book.json) (`player`, `solid`, `fake`, `water`).
2. Build WASI fixtures: `yarn task run wanix:wasm:build`
3. Optional VM pin check: `yarn task run wanix:ensure`
4. Drop `ops/fixtures/content/dist/wanixtour.book.json`
5. CLI to `#go Start Here` (or walk the chain from any board)

## Board chain (south)

| Board | Fixture / action |
|-------|------------------|
| Start Here | intro |
| concepts | — |
| wanixintro | — |
| wanixdrop | `termbridge.wasm` (also `hello.wasm`, `hold.wasm`) |
| wanixmenu | `#wanix` |
| wanixvm | `#wanix vm` (in-app iframe host; first boot fetches linux + v86) |
| wanixbind | `#wanix bind wanixnotes` → `scroll-wanixnotes.txt` |
| wanixattach | `#wanix attach`, `ping` / `pong` on termbridge |
| outro | `ops/fixtures/wanix/README.md` |

## Scrolls in this book

| Page | Use |
|------|-----|
| `@scroll wanixnotes` | `#wanix bind wanixnotes` after warm wanix |

Board copy is **bottom-aligned** (rows ~12–21) so instructions stay visible under the default top-half CLI tape.

## Build

```bash
node ops/fixtures/content/templates/wanixtour/gen-boards.mjs
yarn task run content:book:build ops/fixtures/content/templates/wanixtour
```
