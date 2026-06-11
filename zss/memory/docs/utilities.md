# utilities.ts

**Purpose**: Admin scroll, in-memory `CONFIG` (crt / lowrez / scanlines / voice2text / loaderlogging / promptlogging / dev / gadget) and zstd+zip book serialization.

## Dependencies

- `@bokuweb/zstd-wasm` — compress, decompress
- `jszip` — JSZip
- `zss/device/api` — registerinspector, registerstore
- `zss/device/session` — SOFTWARE
- `zss/feature/detect` — getclimode
- `zss/feature/format` — packformat, unpackformat
- `zss/feature/url` — isjoin
- `zss/feature/zsstextui` — DIVIDER, zsstexttape, zsszedlinklinechip
- `zss/feature/zstdwasm` — ensurezstdwasm
- `zss/gadget/data/api` — registerhyperlinksharedbridge
- `zss/gadget/data/scrollwritelines` — scrollwritelines, scrolllinkescapefrag
- `zss/mapping/qr` — qrlines
- `zss/mapping/types` — ispresent, isstring
- `zss/words/types` — COLOR
- `./boardaccess` — memoryreadobject
- `./bookoperations` — memoryexportbook(asjson), memoryimportbook(fromjson), memoryreadelementdisplay
- `./flags` — memoryreadflags
- `./playermanagement` — memoryreadplayerboard
- `./session` — memoryisoperator, memoryreadbookbysoftware, memoryreadoperator, memoryreadtopic, memorywritehalt
- `./types` — BOOK, FIXED_DATE, MEMORY_LABEL

## Exports

| Export | Description |
|--------|-------------|
| `CONFIG_KEYS` | Tuple of supported config flag names |
| `memorysetconfig(list)` | Bulk write a list of `[key, on/off]` pairs |
| `memoryreadconfig(name)` | Read one config flag (`on` / `off`) |
| `memoryreadconfigall()` | Snapshot every config flag |
| `memorywriteconfig(name, value)` | Write a single config flag |
| `memoryadminmenu(player)` | Admin scroll: player list, util, config, multiplayer QR |
| `memorycompressbooks(books)` (async) | Zip + zstd → base64url |
| `memorydecompressbooks(base64bytes)` (async) | base64url → books (supports legacy string, msgpack, and zstd payloads) |
