---
title: Loader
---

For the player-facing list of every `#command`, see [All commands](/firmware#all-commands) (filter by the **L** badge).

**Purpose**: Defines `LOADER_FIRMWARE` — commands for loading and parsing external files (text, JSON, binary) and managing loader context. Used when importing content into books.

## Implementations

`LOADER_FIRMWARE` in [`loader.ts`](../loader.ts) registers `#readline` / `#readjson` / `#readbin` (and media / context commands). The read handlers live under [`loader/`](../loader/):

| Module | Command | Role |
|--------|---------|------|
| [`loader/text.ts`](../loader/text.ts) | `#readline` | Line cursor + regex capture |
| [`loader/json.ts`](../loader/json.ts) | `#readjson` | JMESPath query into a stat |
| [`loader/binary.ts`](../loader/binary.ts) | `#readbin` | Typed binary reads |
| [`loader/media.ts`](../loader/media.ts) | `#media` | Submit URL to board TV helper |
| [`loader/mediaqueueflags.ts`](../loader/mediaqueueflags.ts) | (get hooks) | `mediaqueue` / `medialist` flag lines |

## get(chip, name) Hook

These names work for every loader, including a chat loader with no file:

| Name | Value |
|------|--------|
| `chatconnected` | `1` when the twitch chat slot is connected, else `0` |
| `chatchannel` | Channel name. Copy with `#set` before an `is` check |
| `chatusername` | Logged-in nick (token user, or the anonymous `justinfan` nick). Copy with `#set` before an `is` check |
| `mediaqueue` | Array of approval rows, `index duration name title` (`3m` or `unknown`; title falls back to the url). Walk with `#foreach` |
| `medialist` | Array of play-queue rows, `index name title`. Walk with `#foreach` |

`mediaqueue` and `medialist` read the operator board's media helper. An unbound helper is an empty array.

Loaders can post to twitch with `#chat say <text>`. It always speaks as the operator (the tab that owns the twitch connection), and needs a tokened `#chat <channel> twitchtoken=` session. Other `#chat` forms are CLI only. See `ops/fixtures/lang/coolregionsbow/twitchmedia.zss` (`!media`, `!queue`) for `#foreach` over `medialist` / `mediaqueue` with `#chat say`.

Returns loader metadata based on format:

| Format | Available names |
|--------|-----------------|
| text | `format`, `filename`, `cursor`, `lines`, `eof` |
| json | `format`, `filename` |
| binary | `format`, `filename`, `cursor`, `bytes`, `eof` |

## Commands

### `#readline` (text)

`#readline <kind> [args…]` — implemented by [`loader/text.ts`](../loader/text.ts).

#### seek

`#readline seek <cursor>`

Sets the line cursor (0-based). Clamped to `[0, lines]` — **`cursor = lines` is EOF** (one past the last line).

#### next

`#readline next`

Advances the cursor by one (clamped to EOF).

#### Regex capture

`#readline <regex> <name1> [name2] …`

- Matches `regex` (case-insensitive) against the **current** line
- Capture group 1 → `name1`, group 2 → `name2`, etc.
- Unmatched captures on a real line get `0`
- **Does not advance** — use `#readline next` to move
- On **EOF** (`cursor = lines`): every capture name is set to `''` (empty string)

```
#readline ^(\d+)\s+(\w+)$ count label
```

If line is `42 foo`, sets `count=42`, `label='foo'`. Cursor stays put.

#### End of file

| Check | Meaning |
|-------|---------|
| `#while not eof do` / `#if not eof` | Readable `eof` flag: `1` when `cursor = lines`, else `0` |
| `#if cursor = lines` | Same EOF condition via cursor |
| empty capture after `#readline` | On EOF, captures are `''` (vs `0` for a failed match on a real line) |

```
#while not eof do
#readline "^(.*)$" line
' ... use $line ...
#readline next
#done
```

Rematch the same line (cursor does not move on regex):

```
#readline "(.*?)\|(.*?):(.*)" chatuser chatvoice chattext
#readline "(.*?)\|(.*?):(https?://\S+)$" chatuser chatvoice url
```

### `#readjson` (JSON)

`#readjson <jmespath_filter> <name>` — implemented by [`loader/json.ts`](../loader/json.ts).

- **filter** — JMESPath expression (e.g. `items[0].name`, `people[*].id`)
- **name** — stat to store the result

```
#readjson title mytitle
#readjson items[0].price firstprice
#readjson users[*].name usernames
```

See [JMESPath](https://jmespath.org/) for query syntax.

### `#readbin` (binary)

`#readbin <kind> [args…]` — implemented by [`loader/binary.ts`](../loader/binary.ts).

#### seek

`#readbin seek <cursor>`

Sets the binary reader cursor to the given byte index.

#### Numeric types

For each type, reads from the current cursor and stores in the given stat name. Suffix `le` = little-endian.

| Kind | Size | Description |
|------|------|-------------|
| `float32` / `float32le` | 4 | 32-bit float |
| `float64` / `float64le` | 8 | 64-bit float |
| `int8` / `int8le` | 1 | 8-bit signed |
| `int16` / `int16le` | 2 | 16-bit signed |
| `int32` / `int32le` | 4 | 32-bit signed |
| `int64` / `int64le` | 8 | 64-bit signed (BigInt) |
| `uint8` / `uint8le` | 1 | 8-bit unsigned |
| `uint16` / `uint16le` | 2 | 16-bit unsigned |
| `uint32` / `uint32le` | 4 | 32-bit unsigned |
| `uint64` / `uint64le` | 8 | 64-bit unsigned (BigInt) |

Example: `#readbin uint32 mystat` — reads 4 bytes into `mystat`.

#### text

`#readbin text <lengthkind> <target>`

- Reads a length using `lengthkind` (e.g. `uint8`, `uint16`)
- Decodes `length` bytes as UTF-8
- Stores in `target` and advances the cursor

Example: `#readbin text uint8 str`

### Media queue

| Command | Args | Description |
|---------|------|-------------|
| `media` | `<name> <url>` | Submit URL to the board TV helper with explicit queue display name (operator + `speaker` / `media` permission). Prefer `#withplayerboard` or `#withboard` first so the helper resolves from loader targeting. Empty name sanitizes to `player`. |
| `queue` | (same as CLI `#queue`) | Media queue admin. Runs as the operator (`elementfocus`), so the loader script has to decide who may call it. |

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

### Input simulation

| Command | Args | Description |
|---------|------|-------------|
| `userinput` | `action` | Simulate input: up, down, left, right, shootup/down/left/right, ok, cancel |

## Design notes

- `withobject` enables `#oneof chatuser … #withobject chatuser #goup '` patterns for chat-driven object behavior
- `#withplayerboard` picks among **active** players (activelist + object on board), cycling each pid once through a shuffled `ids` queue under `withplayerboard_tracking` (same pattern as `@pick shuffle`); then sets that player's board. Does not set player focus — use `#withobject` for that
- `#withboard` / `#withplayerboard` / `#withobject` set board and object **targeting** on `READ_CONTEXT`; `memorytickloaders` in [`zss/memory/runtime.ts`](../../memory/runtime.ts) persists those five fields per loader chip id across ticks (not whole `READ_CONTEXT`, not across separate loader invocations)
- Loader `#media <name> <url>` uses `READ_CONTEXT.board` when set (via `#withboard` / `#withplayerboard`), otherwise the operator's player board, for helper resolution
- Loader context overrides runtime behavior for messaging/UI
- `endgame` is no-op in loaders to avoid ending session during import
