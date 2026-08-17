---
title: Local media helpers on Electron
---

**Purpose:** Ship cafe's **media-queue helper** as a local **Electron** (Chromium) desktop app. The helper PeerJS-calls cafe for board TV playback. Cafe stays a website; the helper ships as a local binary on GitHub Releases.

**Status:** Electron is the desktop stack for the media-queue helper. Media-queue + cafe `#media` queue list / `#queue` admin menu / board TV receive path live under [`ops/media-queue/`](../media-queue/README.md) and [`zss/feature/mediaqueue/`](../../zss/feature/mediaqueue/docs/README.md). Inbound media uses **PeerJS `MediaConnection`**, not WHEP.

## Product shape

| Helper | Job | Cafe side |
|--------|-----|-----------|
| **Media queue** (Electron) | yt-dlp download + local playback; answers player `MediaConnection`s | `#media` queue list; `#queue` admin menu; **board TV** sink via direct helper connect -- **no tape overlay** |

The helper ships as an Electron app on GitHub Releases (`v*` tags).

```mermaid
flowchart TB
  subgraph cafe [zed.cafe browser]
    CLI["#media / #queue …"]
    Peer["PeerJS peer on terminal.zed.cafe"]
    TV["Board TV MediaStream sink"]
  end

  subgraph helpers [Electron local app]
    MQ["Media queue: yt-dlp + video.captureStream"]
  end

  CLI -->|queue RPCs DataConnection| MQ
  MQ -->|MediaConnection per player on board| Peer
  Peer --> TV
```

## Why Electron

- **Chromium** provides `HTMLVideoElement.captureStream()` for media-queue WebRTC (WKWebView on Tauri macOS does not).
- Playback path: download MP4 → `<video>.play()` → `video.captureStream()` → PeerJS.

## Media-queue helper

1. Register a Peer on `terminal.zed.cafe` (same PeerServer as [`netterminal.ts`](../../zss/feature/netterminal.ts)).
2. Cafe `#media <url>` and `#queue` admin commands mutate a host-owned FIFO queue and push updates over a **DataConnection** (control plane). `#queue <peerid>` bind writes the helper peer id onto the bound board as a synced gadget MEDIA layer (`text/mediaqueue-helper`).
3. On queue advance, the helper runs **yt-dlp** into a local cache file, plays it in Chromium, and publishes **`video.captureStream()`** to each player tab that calls the helper via **`MediaConnection`** (host admin and joins use the same path).
4. Leaving the bound board tears down the player call and board TV sink (video + speaker audio).

## Build / dev

```bash
yarn task run mediaqueue:build:desktop
yarn task run mediaqueue:dev
```

Installers land under `ops/media-queue/dist/` (electron-builder).

## Explicitly out

| Approach | Why out |
|----------|---------|
| WHEP / tape overlay / Chromium sidecar | Wrong UX for board TV; PeerJS is the cafe clique |
| Cloudflare Worker / yt-dlp | Cannot run PeerJS media in a Worker |
| Cafe itself as a desktop app | Product stays https://zed.cafe |
| Canvas re-capture on macOS | Replaced by Electron `video.captureStream()` |

## Related

- Media queue: [`ops/media-queue/`](../media-queue/README.md)
- PeerJS baseline: [`zss/feature/docs/netterminal.md`](../../zss/feature/docs/netterminal.md)
- Windows signing: [`desktop-signing.md`](desktop-signing.md)
