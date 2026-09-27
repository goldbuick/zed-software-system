---
title: utilities.ts
---

**Purpose**: Admin scroll, in-memory `CONFIG` (crt / lowrez / scanlines / voice2text / loaderlogging / promptlogging / dev / gadget) and the browser-sim entry points that post book snapshots to the compress worker.

Serialize and deserialize bytes live in [`memorysnapshotio.ts`](zss/memory/memorysnapshotio.ts). The worker runs those functions. Headless/climode and Jest call them directly. The browser sim only posts a snapshot or a base64 string.

## Dependencies

- `zss/device/api` — registerinspector
- `zss/feature/storage` — storagewriteconfig
- `zss/device/session` — SOFTWARE
- `zss/feature/detect` — getclimode
- `zss/feature/url` — isjoin
- `zss/feature/zsstextui` — DIVIDER, zsstexttape, zsszedlinklinechip
- `zss/compressworkerclient` — off-thread snapshot serialize / deserialize (browser sim)
- `zss/memory/memorysnapshotio` — `MEMORY_BOOKS_BUNDLE` type
- `zss/gadget/data/api` — registerhyperlinksharedbridge
- `zss/gadget/data/scrollwritelines` — scrollwritelines, scrolllinkescapefrag
- `zss/mapping/qr` — qrlines
- `zss/mapping/types` — ispresent, isstring
- `zss/words/types` — COLOR
- `./boardaccess` — memoryreadelement
- `./bookoperations` — memoryreadelementdisplay, memoryreadflags
- `./playermanagement` — memoryreadplayerboard
- `./session` — memoryisoperator, memoryreadmainbook, memoryreadoperator, memoryreadtopic, memorywritehalt
- `./types` — BOOK, MEMORY_LABEL

## Exports

| Export | Description |
|--------|-------------|
| `CONFIG_KEYS` | Tuple of supported config flag names |
| `memorysetconfig(list)` | Bulk write a list of `[key, on/off]` pairs |
| `memoryreadconfig(name)` | Read one config flag (`on` / `off`) |
| `memoryreadconfigall()` | Snapshot every config flag |
| `memorywriteconfig(name, value)` | Write a single config flag |
| `memoryadminmenu(player)` | Admin scroll: player list, util, config, multiplayer QR |
| `memorycompressbooks(books)` (async) | browser sim posts `{ books, main? }` to the compress worker and returns base64url; throws if the worker cannot run |
| `memorydecompressbooks(base64bytes)` (async) | browser sim posts the base64 string to the compress worker and returns `{ books, main? }`; throws if the worker cannot run |
