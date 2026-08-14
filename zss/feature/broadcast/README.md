# ZSS Web Broadcast Client

First-party browser broadcast client under `zss/feature/broadcast/`. Replaces the closed-source `amazon-ivs-web-broadcast` npm package.

## Directions

| Direction | CLI | Role |
|-----------|-----|------|
| **Out** (cafe canvas + synth) | `#broadcast` | WHIP / IVS **publish** to Twitch, YouTube relay, IVS |
| **In** (URL queue → board TV) | `#mediaqueue` + PeerJS `call` | Tauri helper [`ops/media-queue/`](../../../ops/media-queue/README.md) loads URLs and calls cafe — see [`ops/docs/local-media-helpers-tauri.mdx`](../../../ops/docs/local-media-helpers-tauri.mdx) |

YouTube relay packaging migrates Electron → Tauri on the same stack; cafe `#broadcast whip youtube` stays the product contract.

## Capture (outbound)

- **Video:** compositor draws attached image/canvas sources into an offscreen canvas (default **1280×720 @ 60fps**, ~3.5 Mbps cap).
- **Audio:** Web Audio graph mixes attached `MediaStream` inputs into one outbound audio track.

Bridge resolves sources today: main game `<canvas>` + `synthbroadcastdestination()`.

## Transports (outbound)

| Kind | Auth | Endpoint |
|------|------|----------|
| `ivs-low-latency` | IVS / Twitch stream key | `https://g.webrtc.live-video.net:4443/v1/offer` (default) |
| `whip` | Bearer token (required) | **Any WHIP URL** or alias (`twitch`, `youtube`, `ivs`) |
| `ivs-whip` | IVS Real-Time participant token | `https://global.whip.live-video.net` (default) |

Low-latency signaling follows the JSON `/v1/offer` flow observed from the IVS Web Broadcast SDK. Generic WHIP follows [RFC 9725](https://www.rfc-editor.org/info/rfc9725): `POST` with `Content-Type: application/sdp` and `Authorization: Bearer …`.

## Usage

```ts
import { createwebbroadcastclient } from 'zss/feature/broadcast/webbroadcastclient'

const client = createwebbroadcastclient()
client.on('connectionstatechange', (state) => { /* ... */ })
client.on('activestatechange', (active) => { /* ... */ })
client.on('error', (message) => { /* ... */ })

await client.addimagesource(canvas, 'video', { index: 1 })
await client.addaudioinputdevice(audio.stream, 'audio')

await client.start({ kind: 'ivs-low-latency', streamKey: 'sk_...' })

await client.start({
  kind: 'whip',
  endpoint: 'https://g.webrtc.live-video.net:4443/v2/offer',
  bearer: '<stream-key-or-token>',
})

await client.start({ kind: 'ivs-whip', token: 'participant-token' })

client.stop()
client.delete()
```

## Bridge integration

`bridge:streamstart` accepts:

- **String** — `{ kind: 'ivs-low-latency', streamKey }` (`#broadcast <key>`).
- **Object** — `ivs-low-latency`, `whip` (`endpoint` + `bearer`), or `ivs-whip` (`token`, optional `endpoint`).

CLI:

```text
#broadcast <stream-key>                              # IVS low-latency / Twitch
#broadcast whip <endpoint|alias> <bearer>            # generic WHIP
#broadcast whip twitch <twitch-stream-key>           # Twitch WebRTC v2 (WHIP)
#broadcast whip youtube <local-bearer>               # local YouTube RTMP relay app
#broadcast whip ivs <participant-token>              # IVS Real-Time stage
```

Full URL still works: `#broadcast whip https://… <bearer>`.

## YouTube (local relay)

Browsers cannot speak RTMP. Download the **Zed Cafe YouTube Relay** tray app from GitHub Releases (same `v*` tag as headless), set the YouTube stream key in the app, then:

```text
#broadcast whip youtube <local-bearer>
```

The alias targets `https://127.0.0.1:8889/cafe/whip`. See [`ops/youtube-rtmp-relay/README.md`](../../../ops/youtube-rtmp-relay/README.md). Packaging target is **Tauri v2** (Electron is legacy until migration completes) — [`ops/docs/local-media-helpers-tauri.mdx`](../../../ops/docs/local-media-helpers-tauri.mdx).
