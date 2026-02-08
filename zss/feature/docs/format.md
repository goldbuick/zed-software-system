# format.ts

**Purpose**: Object formatting and serialization for memory/gadget state. Uses key mapping and optional format transformers. Serializes to msgpack via `packformat`/`unpackformat`.

## Dependencies

- `msgpackr` — pack, unpack
- `zss/device/api` — apierror
- `zss/device/session` — SOFTWARE
- `zss/mapping/types` — MAYBE, ispresent, isstring

## Types

| Type | Description |
|------|-------------|
| `FORMAT_OBJECT` | `[string?, any?, ...FORMAT_OBJECT[]]` — flat tuple of key/value pairs |
| `FORMAT_METHOD` | `(value: any) => any` — transformation for a field |

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `FORMAT_SKIP` | — | Returns null to skip field during formatting |
| `formatobject` | `obj`, `keymap`, `formatmap?` | Format object: apply formatmap, map keys via keymap, produce FORMAT_OBJECT |
| `unformatobject` | `formatted`, `keymap`, `formatmap?` | Reverse formatobject; reconstruct original object |
| `packformat` | `entry` | Pack FORMAT_OBJECT to Uint8Array (msgpack) |
| `unpackformat` | `content` | Unpack Uint8Array or JSON string to FORMAT_OBJECT |

## Usage

Used by `zss/memory/bookoperations`, `zss/memory/boardelement`, `zss/gadget/data/compress`, `zss/device/gadgetserver` for persisting and transmitting state.
