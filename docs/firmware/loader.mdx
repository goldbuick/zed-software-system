---
title: loader.ts
---

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
| `withplayerboard` | (none) | Cycle next active player's board via `withplayerboard_tracking` shuffle queue; element = random pt |
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
- `#withplayerboard` picks among **active** players (activelist + object on board), cycling each pid once through a shuffled `ids` queue under `withplayerboard_tracking` (same pattern as `@pick shuffle`); then sets that player's board. Does not set player focus — use `#withobject` for that
- `#withboard` / `#withplayerboard` / `#withobject` set board and object **targeting** on `READ_CONTEXT`; [`memorytickloaders`](../../memory/runtime.ts) persists those five fields per loader chip id across ticks (not whole `READ_CONTEXT`, not across separate loader invocations)
- Loader context overrides runtime behavior for messaging/UI
- `endgame` is no-op in loaders to avoid ending session during import
