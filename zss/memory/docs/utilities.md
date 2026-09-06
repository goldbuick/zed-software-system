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
- `zss/feature/format` — unpackformat
- `zss/feature/url` — isjoin
- `zss/feature/zsstextui` — DIVIDER, zsstexttape, zsszedlinklinechip
- `zss/feature/zstdwasm` — ensurezstdwasm
- `zss/memory/bookzstd` — shared zstd level + in-process compress
- `zss/memory/bookcompresspod` — POD envelope → json stringify or FORMAT_OBJECT msgpack+zstd
- `zss/compressworkerclient` — nested compressspace worker (browser / CLI save path)
- `zss/gadget/data/api` — registerhyperlinksharedbridge
- `zss/gadget/data/scrollwritelines` — scrollwritelines, scrolllinkescapefrag
- `zss/mapping/encode` — arraybuffertobase64, base64url helpers
- `zss/mapping/qr` — qrlines
- `zss/mapping/types` — ispresent, isstring
- `zss/words/types` — COLOR
- `./boardaccess` — memoryreadobject
- `./bookoperations` — memoryexportbook(asjson), memoryimportbook(fromjson), memoryreadelementdisplay
- `./bookcompresspod` — compressbookspodenvelope (shared with compress worker)
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
| `memorycompressbooks(books)` (async) | snapshot JSON PODs on sim (yields); worker finishes `json` (climode) or POD→FORMAT_OBJECT msgpack+zstd (browser). Wire unchanged. |
| `memorysnapshotbookspod(books)` (async) | trimmed `memoryexportbookasjson` trees + `main` (yields between books); worker input only |
| `memorydecompressbooks(base64bytes)` (async) | base64url → `{ books, main? }`; also loads legacy JSZip / bare book-array payloads |
