# Zed Cafe Media Queue

Local **Tauri v2** helper that loads a URL queue, captures a browser window, and **PeerJS `call`s** [zed.cafe](https://zed.cafe). Video lands on a **board TV** sink — not the tape overlay.

Design: [`ops/docs/local-media-helpers-tauri.mdx`](../docs/local-media-helpers-tauri.mdx)

## Product contract

| Plane | Transport |
|-------|-----------|
| Control (queue RPCs) | PeerJS `DataConnection` to cafe peer |
| Media | PeerJS `MediaConnection` (`peer.call`) |
| Signaling | `terminal.zed.cafe` (same PeerServer as netterminal) |

Cafe CLI (operator, bridge permission family):

```text
#mediaqueue
#mediaqueue listen <peerid>
#mediaqueue add https://example.com
#mediaqueue list | next | goto <i> | clear | call | stop | peer
```

Bare `#mediaqueue` opens a scroll: queue list, URL text field, add/next/clear/call.

`listen <peerid>` creates the cafe Peer as that id and **binds it to the operator’s current board** (room fan-out stays on that board even if the operator walks away).
## Dev

```bash
cd ops/media-queue/src-tauri
cargo tauri dev
```

Requires Tauri v2 Linux/macOS/Windows prerequisites (WebKitGTK on Linux). No new citty task — run `cargo tauri` from this folder until packaging shares the relay release path.

## Use

1. In cafe: `#mediaqueue listen <peerid>` — binds that PeerJS id to the current board; paste the same id into the app.
2. Open this app — paste cafe peer id — **Save peer** — **Connect**.
3. In cafe: `#mediaqueue add <url>` — app opens a browser window and may prompt for capture.
4. Or click **Capture + call** and pick the **Media Queue Browser** window.
5. Video appears on the board TV for the listening tab and for **other players on the bound board** (joincode clique; board = room). `#mediaqueue stop` tears down the cafe Peer + room calls.

## Capture note

MVP uses `getDisplayMedia` (pick the browser window). True tab-capture / Chromium sidecar is a later option if OS webview capture is insufficient.
