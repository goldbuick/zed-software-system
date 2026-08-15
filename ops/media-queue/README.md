# Zed Cafe Media Queue

Local **Tauri v2** helper that loads a URL queue, captures a browser window, and **PeerJS `call`s** [zed.cafe](https://zed.cafe). Video lands on a **board TV** sink -- not the tape overlay.

Design: [`ops/docs/local-media-helpers-tauri.mdx`](../docs/local-media-helpers-tauri.mdx)

## Product contract

| Plane | Transport |
|-------|-----------|
| Control (queue RPCs) | PeerJS `DataConnection` to cafe peer |
| Media | PeerJS `MediaConnection` (`peer.call`) |
| Signaling | `terminal.zed.cafe` (same PeerServer as netterminal) |

Cafe: scroll-only **`#media`** (bridge permission family). Start binds a peer id to the current board; queue controls live in the scroll.

## Build

```bash
yarn task run mediaqueue:build
yarn task run mediaqueue:build:desktop
# or platform-specific:
yarn task run mediaqueue:build:desktop:mac
yarn task run mediaqueue:build:desktop:win
```

Installers land under `ops/media-queue/src-tauri/target/release/bundle/`. Tag releases also publish `.dmg` / `.exe` on [GitHub Releases](https://github.com/goldbuick/zed-software-system/releases); Windows signing via SignPath OSS is documented in [`ops/docs/desktop-signing.md`](../docs/desktop-signing.md).

Requires Rust and [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/). `mediaqueue:build` installs `@tauri-apps/cli` via yarn (no global `cargo tauri` needed).

## Dev

```bash
yarn task run mediaqueue:dev
```

## Use

1. Open this app -- it starts a PeerJS peer and shows **Your peer id**.
2. Click **Copy** (or select the id) and in cafe run `#media` -- paste the id -- **Start**.
3. In cafe: add URLs from the `#media` scroll -- app opens a browser window and may prompt for capture.
4. Or click **Recapture** and pick the **Media Queue Browser** window.
5. Video appears on the board TV for the host and for **other players on the bound board**. **Stop** in the scroll tears down the cafe connection + room calls.

## Capture note

MVP uses `getDisplayMedia` (pick the browser window). True tab-capture / Chromium sidecar is a later option if OS webview capture is insufficient.
