# qr.ts

**Purpose**: QR code to ZSS text format. Renders content as Unicode QR and maps blocks to `$char` codes for display.

## Dependencies

- `uqr` — renderUnicodeCompact

## Exports

| Export | Description |
|--------|-------------|
| `qrlines(content)` | Returns string[] of `$219` etc. lines (space→32, blocks→219/220/223) |

## Char Mapping

| Unicode | ZSS char |
|---------|----------|
| 32 (space) | 32 |
| 9600 (▀) | 223 |
| 9604 (▄) | 220 |
| 9608 (█) | 219 |
