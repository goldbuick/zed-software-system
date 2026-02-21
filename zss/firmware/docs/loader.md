# loader.ts

**Purpose**: Defines `LOADER_FIRMWARE` — commands for loading and parsing external files (text, JSON, binary) and managing loader context. Used when importing content into books.

## Dependencies

- `zss/device/api` — BINARY_READER, JSON_READER, TEXT_READER, registerinput
- `zss/memory/loader` — memoryloadercontent, memoryloaderformat
- `zss/words/send` — parsesend
- `./loaderbinary`, `./loaderjson`, `./loadertext` — loader implementations

## get(chip, name) Hook

Returns loader metadata based on format:

| Format | Available names |
|--------|-----------------|
| text | `format`, `filename`, `cursor`, `lines` |
| json | `format`, `filename` |
| binary | `format`, `filename`, `cursor`, `bytes` |

## Commands

### File Reading

| Command | Args | Description |
|---------|------|-------------|
| `readline` | (see loadertext.md) | Delegate to loadertext |
| `readjson` | (see loaderjson.md) | Delegate to loaderjson |
| `readbin` | (see loaderbinary.md) | Delegate to loaderbinary |

### Context

| Command | Args | Description |
|---------|------|-------------|
| `withboard` | `stat` | Set READ_CONTEXT.board to board at stat; element = random pt |
| `withobject` | `id` | Set READ_CONTEXT.element to object; updates elementid, elementisplayer, elementfocus for send/chat |

### Loader context

| Command | Description |
|---------|-------------|
| `endgame` | No-op (avoids ending session during import) |

*(shortsend, send, stat, text, hyperlink are not documented here)*

### Input Simulation

| Command | Args | Description |
|---------|------|-------------|
| `userinput` | `action` | Simulate input: up, down, left, right, shootup/down/left/right, ok, cancel |

## Design Notes

- `withobject` enables `#oneof chatuser … #withobject chatuser #goup '` patterns for chat-driven object behavior
- Loader context overrides runtime behavior for messaging/UI
- `endgame` is no-op in loaders to avoid ending session during import
