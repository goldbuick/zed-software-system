# Media queue (cafe)

Receive path for the **Zed Cafe Media Queue** Tauri helper.

| Module | Role |
|--------|------|
| [`protocol.ts`](../protocol.ts) | DataConnection message types |
| [`queue.ts`](../queue.ts) | Host-owned URL queue |
| [`receive.ts`](../receive.ts) | Peer listen, answer `call` |
| [`sinkregistry.ts`](../sinkregistry.ts) / [`attachvideo.ts`](../attachvideo.ts) | Stream to `useMedia.screen` |

CLI: `#mediaqueue …` (see [`mediaqueue.ts`](../../../firmware/cli/commands/mediaqueue.ts)). Board sink: [`boardtvsink.tsx`](../../../gadget/boardtvsink.tsx).

Design: [`ops/docs/local-media-helpers-tauri.mdx`](../../../../ops/docs/local-media-helpers-tauri.mdx)
