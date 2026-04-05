# writeui.ts and zsstextui.ts

**Purpose**

- **`zsstextui.ts`** — Pure zsstext line strings: `layoutheaderlines`, `layoutsectionlines`, `layouttbarline`, `layoutbbarline`, `layoutoptionline`, `layouttextline`, and constants `DIVIDER`, `DOWN_SPOUT`, `UP_SPOUT`. Use these for any tape/terminal/scroll line layout; emit with `write` (terminal) or `gadgettext` (scroll).
- **`writeui.ts`** — Terminal **sinks** only: `write` (`apilog`), `writehyperlink`, `writerunit`, `writeqr`, `writecopyit`, `writeopenit`. No layout composition here.

## Dependencies

**writeui:** `zss/device/api`, `zss/mapping/qr`

**zsstextui:** none (pure strings)

## Where layout is used

Call sites import `zss/feature/zsstextui` and loop lines into `write` or `gadgettext`. Examples: `zss/device/register.ts`, `zss/device/bridge.ts`, `zss/firmware/cli/commands/*`, `zss/rom/index.ts`, `zss/memory/*` (for `DIVIDER`).

## writeui exports

| Function | Description |
|----------|-------------|
| `write` | Raw line to terminal log |
| `writehyperlink` | `!payload;label` |
| `writerunit` | `!runit cmd;label` |
| `writeqr` | QR ASCII lines |
| `writecopyit` | Copy + optional QR + `registerterminalfull` |
| `writeopenit` | `!openit …;label` |

## zsstextui exports

| Symbol | Description |
|--------|-------------|
| `layouttbarline` / `layoutbbarline` | Single bar line by width |
| `layoutheaderlines` | Three lines: tbar, title, bbar |
| `layoutsectionlines` | Section block (spacer, gray label, bbar) |
| `layoutoptionline` | Option key + label |
| `layouttextline` | Edge + blue body |
| `DIVIDER`, `DOWN_SPOUT`, `UP_SPOUT` | Shared constants |

## Related

- [`markdownzsstext.ts`](../parse/markdownzsstext.ts) — CommonMark → zsstext lines (`parsemarkdownwithzsstextsink`, `parsetokenzsstext`)
- [`terminalwritelines.ts`](../terminalwritelines.ts) / [`scrollwritelines`](../../gadget/data/scrollwritelines.ts) — bulk multiline sinks; for scroll, build tape with [`zsstextui.ts`](../zsstextui.ts) then pass one string to `scrollwritelines`
