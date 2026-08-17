# Media queue (cafe)

Receive path for the **Zed Cafe Media Queue** Electron helper.

| Module | Role |
|--------|------|
| [`protocol.ts`](../protocol.ts) | DataConnection message types |
| [`queue.ts`](../queue.ts) | Host-owned FIFO URL queue |
| [`urlnormalize.ts`](../urlnormalize.ts) | Dedupe keys for queue URLs |
| [`mediaguards.ts`](../mediaguards.ts) | Submit vs manage permission checks |
| [`mediamenu.ts`](../mediamenu.ts) / [`queuemenu.ts`](../queuemenu.ts) / [`panel.ts`](../panel.ts) | `#media` / `#queue` CLI + bridge actions |
| [`playerconnect.ts`](../playerconnect.ts) | Direct helper `MediaConnection`; leave board disconnects, return reconnects while still bound |
| [`broadcastaudio.ts`](../broadcastaudio.ts) | Mix board TV audio into `#broadcast` compositor (same board only) |
| [`roompeers.ts`](../roompeers.ts) | Board players -> clique peer ids (legacy tests) |
| [`callmetadata.ts`](../callmetadata.ts) | `player` MediaConnection metadata |
| [`sinkregistry.ts`](../sinkregistry.ts) / [`attachvideo.ts`](../attachvideo.ts) | Stream to `useMedia.screen` |
| [`boardtvvisible.ts`](../boardtvvisible.ts) | Board TV show gate (gadget board + video) |

## Permissions

| Action | Who | Permission |
|--------|-----|------------|
| `#media`, `#media <url>` | Players (creative) | `speaker` (`media`) |
| `#queue`, `#queue` bind, skip, clear, stop, limit | Admin / mod | `bridge` (`mediamanage`) |

`#media <url>` requires a bound helper (`#queue <peerid>` first). Queue is FIFO autoplay: finished items are removed; failures auto-skip.

Leaving the bound board disconnects the local helper call (speakers and broadcast mix). Returning to that board reconnects while `#queue` is still bound. `#queue stop` clears the bind.

## Commands

| Command | Role |
|---------|------|
| `#media` | Queue list (user names, index, url) |
| `#media <url>` | Submit URL (deduped, per-player limit default 3) |
| bare chat URL | Pasting a whole-message allowlisted http(s) URL is equivalent to `#media <url>` (speaker required; see `mediaischatqueueurl`). Join submits are handled on the host helper tab (`bridge:mediapanel` is not forwarded). |
| `#queue` | Admin: control menu (skip / clear / stop links + limit line) |
| `#queue <peerid>` | Admin: bind helper on current board |
| `#queue skip` | Admin: skip current item |
| `#queue clear` | Admin: stop playback + empty queue (helper stays up) |
| `#queue stop` | Admin: disconnect helper |
| `#queue limit <N>` | Admin: set per-player cap (1-20) |

CLI registration: [`media.ts`](../../../firmware/cli/commands/media.ts), [`queue.ts`](../../../firmware/cli/commands/queue.ts). Board sink: [`boardtvsink.tsx`](../../../gadget/boardtvsink.tsx).

Design: [`ops/docs/local-media-helpers-tauri.mdx`](../../../../ops/docs/local-media-helpers-tauri.mdx)
