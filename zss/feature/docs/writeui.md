# writeui.ts

**Purpose**: Helper functions for writing formatted log lines to the terminal. Used by firmware, device, memory, and heavy modules for user-facing output.

## Dependencies

- `zss/device/api` — apilog, registerterminalfull
- `zss/mapping/qr` — qrlines

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `write` | `device`, `player`, `text` | Write text to terminal log |
| `writetext` | `device`, `player`, `text` | Write colored text |
| `writeheader` | `device`, `player`, `header` | Header with top/bottom bars |
| `writesection` | `device`, `player`, `section` | Section separator |
| `writeoption` | `device`, `player`, `option`, `label` | Option with label |
| `writetbar` | `device`, `player`, `width` | Top bar |
| `writebbar` | `device`, `player`, `width` | Bottom bar |
| `writehyperlink` | `device`, `player`, `hyperlink`, `label` | Hyperlink (format: `!hyperlink;label`) |
| `writecopyit` | `device`, `player`, `content`, `label`, `showqr?` | Copyable content with optional QR |
| `writeopenit` | `device`, `player`, `content`, `label` | Openable link |
| `writeqr` | `device`, `player`, `content` | QR code as ASCII |

## Constants

- `DIVIDER` — `$yellow$205$205$205$196` (horizontal rule)
