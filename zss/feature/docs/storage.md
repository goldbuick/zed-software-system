# storage.ts

**Purpose**: IndexedDB-backed storage for config, history, content files, and variables. Used by device, memory, screens, gadget.

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `storagereadconfigdefault` | `name` | Read default config value |
| `storagereadconfig` | `name` | Read config from storage (async) |
| `storagewriteconfig` | `name`, `value` | Write config (async) |
| `storagereadconfigall` | — | Read all config values |
| `storagereadhistorybuffer` | — | Read command history |
| `storagewritehistorybuffer` | `historybuffer` | Write history |
| `storagereadcontent` | `filename` | Read content file |
| `storagewritecontent` | `filename`, `content` | Write content file |
| `storagereadvars` | — | Read variables |
| `storagewritevar` | `name`, `value` | Write variable |
| `storagewatchcontent` | `player` | Watch content file changes |
| `storagesharecontent` | `player` | Share content |
| `storagenukecontent` | `player` | Delete all content files |

## Consumed By

- `zss/device/register.ts`
- `zss/device/vm.ts`
- `zss/memory/utilities.ts`
- `zss/screens/terminal/input.tsx`, `component.tsx`
- `zss/gadget/engine.tsx`
