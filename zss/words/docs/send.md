# send.ts

**Purpose**: Parses send/message syntax from word arrays. Supports `target:label args`, `label args`, and directional send `dir :label args`. Used by loader and runtime for dispatching messages to elements.

## Dependencies

- `zss/mapping/types` — isstring
- `./dir` — EVAL_DIR, isstrdir
- `./reader` — ARG_TYPE, readargs
- `./types` — WORD

## Exports

| Export | Description |
|--------|-------------|
| `SEND_META` | `{ targetdir?, targetname?, label, args }` |
| `parsesend(words, candirsend?)` | Returns SEND_META |

## Parsing Modes

### Directional Send (candirsend=true, first arg is dir)

| Pattern | Result |
|---------|--------|
| `dir :label args` | targetdir=dir, label=label (without :), args=rest |
| `dir label args` | targetdir=dir, label=label, args=rest |

### Named Send

| Pattern | Result |
|---------|--------|
| `target:label args` | targetname=target, label=label (without :), args=rest |
| `label args` | targetname='self', label=first word, args=rest |

## Fallback

Returns `{ targetname: '', label: '', args: [] }` if parsing fails.
