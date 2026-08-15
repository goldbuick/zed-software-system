# Zed Cafe Media Queue

Local **Tauri v2** helper that loads a URL queue, captures the **Media Queue Browser** webview natively, and **PeerJS `call`s** [zed.cafe](https://zed.cafe). Video lands on a **board TV** sink and audio plays on cafe speakers for the host and board mates -- not the tape overlay.

Design: [`ops/docs/local-media-helpers-tauri.mdx`](../docs/local-media-helpers-tauri.mdx)

## Product contract

| Plane | Transport |
|-------|-----------|
| Control (queue RPCs) | PeerJS `DataConnection` to cafe peer |
| Media | PeerJS `MediaConnection` (`peer.call`, video + audio tracks) |
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
2. Copy peer id and in cafe run `#media <peerid>` (Start in the scroll).
3. In cafe `#media` scroll, add a URL and advance the queue (first `goto`).
4. The **Media Queue Browser** window opens; capture **auto-starts** (no Share screen picker).
5. Video appears on the board TV and audio on speakers for the host and for **other players on the bound board**. **Stop** in the scroll tears down capture + room calls.

## Capture note

| Piece | macOS | Windows |
|-------|-------|---------|
| Video | `WKWebView.takeSnapshot` pumped to `canvas.captureStream` | Planned (`CapturePreview`) |
| Audio | ScreenCaptureKit window audio loopback | Planned (WASAPI process loopback) |

macOS may prompt for screen/audio capture permission the first time. YouTube may still need a click in the browser window for video autoplay.

Some DRM-protected video may snapshot as black frames; test with non-DRM URLs if the board TV is empty.
