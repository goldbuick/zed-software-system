# keyboard.ts

**Purpose**: Clipboard and keyboard utilities. Exports `withclipboard` for browser Clipboard API access.

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `withclipboard` | — | Return `navigator.clipboard` for copy/paste |

## Consumed By

- `zss/device/register.ts` — clipboard paste
- `zss/screens/terminal/input.tsx` — paste
- `zss/screens/panel/text.tsx`
- `zss/screens/editor/editorinput.tsx`
- `zss/device/bridge.ts`
