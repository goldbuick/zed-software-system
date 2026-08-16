# Zed Cafe Media Queue

Local **Electron** helper that downloads queue URLs with **yt-dlp**, plays them locally, and **PeerJS `call`s** [zed.cafe](https://zed.cafe). Video lands on a **board TV** sink and audio plays on cafe speakers for the host and board mates -- not the tape overlay.

Design: [`ops/docs/local-media-helpers-tauri.mdx`](../docs/local-media-helpers-tauri.mdx)

## Product contract

| Plane | Transport |
|-------|-----------|
| Control (queue RPCs) | PeerJS `DataConnection` to cafe peer |
| Media | PeerJS `MediaConnection` (`peer.call`, video + audio tracks) |
| Signaling | `terminal.zed.cafe` (same PeerServer as netterminal) |

Cafe: **`#media`** menu and **`#media <url>`** submit. Admin binds with **`#queue <peerid>`**; **`#queue skip|clear|stop|limit`** for admin queue control.

## Build

```bash
cd ops/media-queue
yarn fetch-binaries
yarn verify-download   # local gate: video h264+aac or audio-only (retries built-in)
yarn start             # electron dev
yarn task run mediaqueue:build
yarn task run mediaqueue:build:desktop
```

`yarn start` / `yarn dist` run `fetch-binaries` automatically. Installers land under `ops/media-queue/dist/`.

## Dev

```bash
yarn task run mediaqueue:dev
```

### Automation hooks (dev only)

| Env | Purpose |
|-----|---------|
| `MQ_PEER_ID_FILE` | Write helper PeerJS id when signaling opens |
| `MQ_DEV_PLAYBACK_PATH` | Skip yt-dlp; play absolute local mp4 (also allows `read_media_file`) |
| `MQ_STATUS_TEXT_FILE` | Write `playing\|N player(s)` link status for headed scripts |

Headed TV sink proof (cafe dev must already be on `:7777`):

```bash
yarn task run cafe:dev
yarn task run cafe:playwright:headed https://localhost:7777 ops/lib/mediaqueue-parity/tvsink-headed.ts
```

Fixture clip: `ops/fixtures/media/test.mp4`.

## Use

1. Open this app -- it starts a PeerJS peer and shows **Your peer id**.
2. Copy peer id and in cafe run `#queue <peerid>` (admin).
3. In cafe: `#media <url>` (players, after bind). Queue autoplays; admin may `#queue skip`, `#queue clear`, or `#queue limit <N>`.
4. The helper downloads via yt-dlp, plays the merged file, and starts the Peer call when cafe advances the queue.
5. Video appears on the board TV and audio on speakers for the host and for **other players on the bound board**. `#queue stop` disconnects the helper; `#queue clear` stops playback and empties the queue. **Clear downloads** wipes the local cache.

## Download note

| Piece | Role |
|-------|------|
| yt-dlp | Extract + merge video/audio, or audio-only fallback for SoundCloud etc. |
| deno | JavaScript runtime for YouTube challenge solving (bundled) |
| ffmpeg | Merge streams (bundled next to yt-dlp) |
| Local cache | `app cache/media-queue/` until **Clear downloads** |

YouTube downloads pass `--js-runtimes deno:<bundled>` and `--remote-components ejs:github` (fetches yt-dlp-ejs solver scripts on first use). If YouTube asks you to sign in, set **youtube cookies** in the helper (defaults to Safari on macOS) so yt-dlp can read your browser session. On 403 the helper retries with rotated `player_client` values, fragment retries, and cache clear. ffmpeg then **transcodes to H.264 + AAC** for Chromium playback and `video.captureStream()`. Use **Clear downloads** before retrying if an old file is cached.

**Audio-only URLs** (SoundCloud, etc.): when yt-dlp finds no video formats, the helper falls back to `bestaudio`, tags the file `audioOnly`, and plays it through a **Winamp-style canvas visualizer** (`canvas.captureStream()` supplies the board TV video track; audio goes to speakers). Track title scrolls on the board TV marquee as for video items -- not drawn on the visualizer.

Unsupported URLs fail loud (`download-failed`). No Screen Recording permission is required.
