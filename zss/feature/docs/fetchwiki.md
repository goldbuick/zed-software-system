# fetchwiki.ts

**Purpose**: Fetch markdown content from the project's GitHub wiki. Used for help content and documentation display.

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `fetchwiki` | `pagepath` | Fetch wiki page; URL: `raw.githubusercontent.com/wiki/goldbuick/zed-software-system/{pagepath}.md`; adds nocache param |

## Flow

- Sanitizes `pagepath` via `NAME` (alphanumeric + `/`)
- Appends random nocache query param to avoid caching
- Returns markdown text

## Consumed By

- `zss/device/register.ts`
- `zss/device/vm.ts`
- `zss/screens/panel/openit.tsx`
- `zss/screens/terminal/openit.tsx`
