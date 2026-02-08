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

### Messaging (Loader-specific)

| Command | Description |
|---------|-------------|
| `send` | Parse full send, dispatch to elements |
| `shortsend` | Parse short send, dispatch |
| `text` | Output to chat (apichat) |
| `hyperlink` | Create chat hyperlink |
| `stat` | No-op |
| `endgame` | No-op |

### Input Simulation

| Command | Args | Description |
|---------|------|-------------|
| `userinput` | `action` | Simulate input: up, down, left, right, shootup/down/left/right, ok, cancel |

## Design Notes

- `withobject` enables `#oneof chatuser … #withobject chatuser #goup '` patterns for chat-driven object behavior
- Loader commands override runtime behavior (e.g., `text` → chat instead of ticker)
- `endgame` is no-op in loaders to avoid ending session during import
