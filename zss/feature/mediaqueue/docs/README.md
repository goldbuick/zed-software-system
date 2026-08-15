# Media queue (cafe)

Receive path for the **Zed Cafe Media Queue** Tauri helper.

| Module | Role |
|--------|------|
| [`protocol.ts`](../protocol.ts) | DataConnection message types |
| [`queue.ts`](../queue.ts) | Host-owned URL queue |
| [`menu.ts`](../menu.ts) / [`panel.ts`](../panel.ts) | Scroll UI + chip actions |
| [`roompeers.ts`](../roompeers.ts) | Board players -> clique peer ids |
| [`callmetadata.ts`](../callmetadata.ts) | `helper` vs `room` MediaConnection metadata |
| [`sinkregistry.ts`](../sinkregistry.ts) / [`attachvideo.ts`](../attachvideo.ts) | Stream to `useMedia.screen` |
| [`boardtvvisible.ts`](../boardtvvisible.ts) | Board TV show gate (gadget board + video) |

CLI: `#media <peerid>` binds the helper; `#media` opens the queue scroll (see [`media.ts`](../../../firmware/cli/commands/media.ts)). Board sink: [`boardtvsink.tsx`](../../../gadget/boardtvsink.tsx).

Design: [`ops/docs/local-media-helpers-tauri.mdx`](../../../../ops/docs/local-media-helpers-tauri.mdx)
