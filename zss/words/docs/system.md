# system.ts

**Purpose**: Platform detection for UI and shortcuts. Exposes navigator-based flags and metakey for cross-platform key hints (Cmd on Mac, Ctrl elsewhere).

## Dependencies

None (uses `navigator.userAgent`).

## Exports

| Export | Description |
|--------|-------------|
| `ismac` | True if Mac |
| `islinux` | True if Linux |
| `isfirefox` | True if Firefox/FxiOS |
| `metakey` | `'cmd'` on Mac, `'ctrl'` elsewhere |

## Context

Used by textformat for `$META` substitution and by editor/hotkey logic for shortcut display.
