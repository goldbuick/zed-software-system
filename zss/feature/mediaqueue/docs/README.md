# Media queue (cafe)

Receive path for the **Zed Cafe Media Queue** Tauri helper.

| Module | Role |
|--------|------|
| [`protocol.ts`](../protocol.ts) | DataConnection message types |
| [`queue.ts`](../queue.ts) | Host-owned FIFO URL queue |
| [`urlnormalize.ts`](../urlnormalize.ts) | Dedupe keys for queue URLs |
| [`mediaguards.ts`](../mediaguards.ts) | Submit vs manage permission checks |
| [`mediamenu.ts`](../mediamenu.ts) / [`panel.ts`](../panel.ts) | `#media` CLI menu + bridge actions |
| [`roompeers.ts`](../roompeers.ts) | Board players -> clique peer ids |
| [`callmetadata.ts`](../callmetadata.ts) | `helper` vs `room` MediaConnection metadata |
| [`sinkregistry.ts`](../sinkregistry.ts) / [`attachvideo.ts`](../attachvideo.ts) | Stream to `useMedia.screen` |
| [`boardtvvisible.ts`](../boardtvvisible.ts) | Board TV show gate (gadget board + video) |

## Permissions

| Action | Who | Permission |
|--------|-----|------------|
| `#media add`, menu | Players (creative) | `speaker` (`media`) |
| bind, skip, clear, stop, limit | Admin / mod | `bridge` (`mediamanage`) |

`#media add` requires a bound helper. Queue is FIFO autoplay: finished items are removed; failures auto-skip.

## Commands

| Command | Role |
|---------|------|
| `#media` | Menu + queue table |
| `#media add <url>` | Submit URL (deduped, per-player limit default 3) |
| `#media skip` | Admin: skip current item |
| `#media clear` | Admin: stop playback + empty queue (helper stays up) |
| `#media stop` | Admin: disconnect helper |
| `#media limit <N>` | Admin: set per-player cap (1-20) |
| `#media <peerid>` | Admin: bind helper on current board |

CLI registration: [`media.ts`](../../../firmware/cli/commands/media.ts). Board sink: [`boardtvsink.tsx`](../../../gadget/boardtvsink.tsx).

Design: [`ops/docs/local-media-helpers-tauri.mdx`](../../../../ops/docs/local-media-helpers-tauri.mdx)
