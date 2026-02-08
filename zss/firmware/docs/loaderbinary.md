# loaderbinary.ts

**Purpose**: Implements `loaderbinary` — a `FIRMWARE_COMMAND` that reads typed binary data from a `BINARY_READER`. Used by `#readbin` in loader context.

## Dependencies

- `zss/device/api` — BINARY_READER
- `zss/firmware` — FIRMWARE_COMMAND type
- `zss/memory/loader` — memoryloadercontent

## Usage

`#readbin <kind> [args…]`

## Operations

### seek

`#readbin seek <cursor>`

Sets the binary reader cursor to the given byte index.

### Numeric Types

For each type, reads from current cursor and stores in the given stat name. Suffix `le` = little-endian.

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

**Example**: `#readbin uint32 mystat` — reads 4 bytes, stores in `mystat`

### text

`#readbin text <lengthkind> <target>`

- Reads a length using `lengthkind` (e.g., `uint8`, `uint16`)
- Decodes `length` bytes as UTF-8 string
- Stores result in `target`
- Advances cursor by length

**Example**: `#readbin text uint8 str` — read length byte, then that many bytes as string

## Implementation

- Uses `DataView` on the reader’s buffer for typed reads
- `readbin` helper returns `undefined` on invalid reader or unknown kind
- BigInt values are cast to `any` for chip compatibility
