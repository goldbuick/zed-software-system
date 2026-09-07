---
title: utilities.ts
---

**Purpose**: Admin scroll, in-memory `CONFIG` (crt / lowrez / scanlines / voice2text / loaderlogging / promptlogging / dev / gadget) and book serialization for URL saves.

## Dependencies

- `@bokuweb/zstd-wasm` — compress, decompress
- `jszip` — legacy JSZip reader only
- `msgpackr` — pack / unpack book arrays
- `zss/device/api` — registerinspector
- `zss/feature/storage` — storagewriteconfig
- `zss/device/session` — SOFTWARE
- `zss/feature/detect` — getclimode
- `zss/feature/format` — FORMAT_OBJECT, unpackformat
- `zss/feature/url` — isjoin
- `zss/feature/zsstextui` — DIVIDER, zsstexttape, zsszedlinklinechip
- `zss/feature/zstdwasm` — ensurezstdwasm
- `zss/memory/bookzstd` — shared zstd level + base64url (sim fallback + compress worker)
- `zss/compressworkerclient` — off-thread zstd of packed book bytes (browser)
- `zss/gadget/data/api` — registerhyperlinksharedbridge
- `zss/gadget/data/scrollwritelines` — scrollwritelines, scrolllinkescapefrag
- `zss/mapping/encode` — arraybuffertobase64, base64url helpers
- `zss/mapping/qr` — qrlines
- `zss/mapping/types` — ispresent, isstring
- `zss/words/types` — COLOR
- `./boardaccess` — memoryreadobject
- `./bookoperations` — memoryexportbook(asjson), memoryimportbook(fromjson), memoryreadelementdisplay
- `./exportidremap` — cross-book protected dense id remap
- `./flags` — memoryreadflags
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
| `memorycompressbooks(books)` (async) | sim: export + cross-book id protect + msgpack `{ main?, books }`; browser: zstd on compress worker (Jest/fallback in-process); climode: JSON envelope |
| `memorydecompressbooks(base64bytes)` (async) | base64url → `{ books, main? }`; also loads legacy JSZip / bare book-array payloads |
