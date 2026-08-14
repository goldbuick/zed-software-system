# Media queue (cafe)

Receive path for the **Zed Cafe Media Queue** Tauri helper.

| Module | Role |
|--------|------|
| [`protocol.ts`](../protocol.ts) | DataConnection message types |
| [`queue.ts`](../queue.ts) | Host-owned URL queue |
| [`receive.ts`](../receive.ts) | `#mediaqueue listen <peerid>` binds Peer to board; answer + room fan-out |
| [`roompeers.ts`](../roompeers.ts) | Board players → clique peer ids |
| [`callmetadata.ts`](../callmetadata.ts) | `helper` vs `room` MediaConnection metadata |
| [`sinkregistry.ts`](../sinkregistry.ts) / [`attachvideo.ts`](../attachvideo.ts) | Stream to `useMedia.screen` |

CLI: `#mediaqueue …` (see [`mediaqueue.ts`](../../../firmware/cli/commands/mediaqueue.ts)). Board sink: [`boardtvsink.tsx`](../../../gadget/boardtvsink.tsx).

Design: [`ops/docs/local-media-helpers-tauri.mdx`](../../../../ops/docs/local-media-helpers-tauri.mdx)
