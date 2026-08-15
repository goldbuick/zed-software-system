# Zed Cafe Media Queue

Local **Tauri v2** helper that downloads queue URLs with **yt-dlp**, plays them locally, and **PeerJS `call`s** [zed.cafe](https://zed.cafe). Video lands on a **board TV** sink and audio plays on cafe speakers for the host and board mates -- not the tape overlay.

Design: [`ops/docs/local-media-helpers-tauri.mdx`](../docs/local-media-helpers-tauri.mdx)

## Product contract

| Plane | Transport |
|-------|-----------|
| Control (queue RPCs) | PeerJS `DataConnection` to cafe peer |
| Media | PeerJS `MediaConnection` (`peer.call`, video + audio tracks) |
| Signaling | `terminal.zed.cafe` (same PeerServer as netterminal) |

Cafe: **`#media`** terminal menu. Admin binds with `#media <peerid>`; players `#media add <url>` after bind; queue autoplays FIFO.

## Build

```bash
cd ops/media-queue
yarn fetch-binaries
yarn verify-download   # local gate: download + h264/aac check (retries built-in)
yarn start             # tauri dev
yarn stage-tauri-resources   # before release build only
yarn task run mediaqueue:build
yarn task run mediaqueue:build:desktop
```

`yarn start` / `yarn dist` run `fetch-binaries` automatically. Installers land under `ops/media-queue/src-tauri/target/release/bundle/`.

Requires Rust and [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/).

## Dev

```bash
yarn task run mediaqueue:dev
```

## Use

1. Open this app -- it starts a PeerJS peer and shows **Your peer id**.
2. Copy peer id and in cafe run `#media <peerid>` (admin).
3. In cafe: `#media add <url>` (players, after bind). Queue autoplays; admin may `#media skip`, `#media clear`, or `#media limit <N>`.
4. The helper downloads via yt-dlp, plays the merged file, and starts the Peer call when cafe advances the queue.
5. Video appears on the board TV and audio on speakers for the host and for **other players on the bound board**. `#media stop` disconnects the helper; `#media clear` stops playback and empties the queue. **Clear downloads** wipes the local cache.

## Download note

| Piece | Role |
|-------|------|
| yt-dlp | Extract + merge video/audio for supported URLs (pinned release) |
| deno | JavaScript runtime for YouTube challenge solving (bundled) |
| ffmpeg | Merge streams (bundled next to yt-dlp) |

YouTube downloads pass `--js-runtimes deno:<bundled>` and `--remote-components ejs:github` (fetches yt-dlp-ejs solver scripts on first use). ffmpeg then **transcodes to H.264 + AAC** for WKWebView playback and `captureStream()`. Use **Clear downloads** before retrying if an old file is cached.
| Local cache | `app_cache_dir()/media-queue/` until **Clear downloads** |

Unsupported URLs fail loud (`download-failed`). No Screen Recording permission is required.
