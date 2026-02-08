# utilities.ts

**Purpose**: Admin UI, book compress/decompress. Admin menu (players, config, dev mode, multiplayer QR), and zstd+zip book serialization.

## Dependencies

- `@bokuweb/zstd-wasm` — compress, decompress
- `jszip` — JSZip
- `zss/device/session` — SOFTWARE
- `zss/feature/*` — format, storage, url, writeui
- `zss/gadget/data/api` — gadget*
- `zss/mapping/func` — doasync
- `zss/mapping/qr` — qrlines
- `zss/words/types` — COLOR
- `./boardoperations` — memoryreadobject
- `./bookoperations` — memoryexportbook, memoryimportbook, memoryreadelementdisplay
- `./playermanagement` — memoryreadplayerboard

## Exports

| Export | Description |
|--------|-------------|
| `memoryadminmenu(player)` | Admin UI: player list, util, config, multiplayer QR |
| `memorycompressbooks(books)` | Zip + zstd → base64url |
| `memorydecompressbooks(base64bytes)` | base64url → books (supports string, msgpack, zstd) |
