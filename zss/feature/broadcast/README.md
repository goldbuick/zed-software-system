# ZSS Web Broadcast Client

First-party browser broadcast client under `zss/feature/broadcast/`. Replaces the closed-source `amazon-ivs-web-broadcast` npm package.

## Capture

- **Video:** compositor draws attached image/canvas sources into an offscreen canvas (default **1280×720 @ 30fps**, ~3.5 Mbps cap). The frame driver depends on page visibility:
  - **Visible** — `addAfterEffect` runs the composite after R3F has finished rendering, so `drawImage` reads a settled canvas instead of landing mid-render, and costs nothing beyond the composite itself since rAF is already running.
  - **Hidden** — rAF is suspended for hidden pages regardless of audibility, so a **worker timer** drives capture. Worker timers are exempt from the one-tick-per-second clamp Chrome applies to hidden-page main-thread timers (live WebRTC only exempts you from the harsher one-per-minute tier). R3F is advanced manually via `advance()` so the game canvas stays live for compositing.

  The framerate gate lives inside the worker, so only on-schedule frames cross to the main thread. The previous **AudioWorklet** pump posted every 128-sample render quantum — ~375 messages/sec at 48 kHz to produce 30 composites — and gated on the receiving side, which put ~345 discarded main-thread tasks per second in front of the render loop.
- **Audio:** Web Audio graph mixes attached `MediaStream` inputs into one outbound audio track.

Bridge resolves sources today: main game `<canvas>` + `synthbroadcastdestination()` + board TV media-queue audio (`mediaqueue` layer) when the player is on the bound board.

## Transports

| Kind | Auth | Endpoint |
|------|------|----------|
| `ivs-low-latency` | IVS stream key | `https://g.webrtc.live-video.net:4443/v1/offer` (default) |
| `whip` | Bearer token (required) | **Any WHIP URL** or alias (`twitch`, `ivs`) |
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

// Twitch WHIP v2 (#broadcast <stream-key>)
await client.start({
  kind: 'whip',
  endpoint: 'https://g.webrtc.live-video.net:4443/v2/offer',
  bearer: '<twitch-stream-key>',
})

// IVS low-latency (#broadcast ivs-ll <stream-key>)
await client.start({ kind: 'ivs-low-latency', streamKey: 'sk_...' })

// Generic WHIP (LiveKit Ingress, Cloudflare Stream, etc.)
await client.start({
  kind: 'whip',
  endpoint: 'https://whip.example/ingest',
  bearer: '<token>',
})

// IVS Real-Time stage (#broadcast ivs-rt <token>)
await client.start({ kind: 'ivs-whip', token: 'participant-token' })

client.stop()
client.delete()
```

## Bridge integration

`bridge:streamstart` accepts:

- **String** — Twitch WHIP v2 (`#broadcast <key>`).
- **Object** — `ivs-low-latency`, `whip` (`endpoint` + `bearer`), or `ivs-whip` (`token`, optional `endpoint`).

CLI:

```text
#broadcast <stream-key>                              # Twitch WebRTC v2 (WHIP)
#broadcast ivs-ll <stream-key>                       # IVS low-latency
#broadcast ivs-rt <participant-token>                # IVS Real-Time stage
#broadcast whip <endpoint|alias> <bearer>            # generic WHIP
#broadcast whip twitch <twitch-stream-key>           # same as bare key (alias)
#broadcast whip ivs <participant-token>              # same as ivs-rt via whip alias
```

Full URL still works: `#broadcast whip https://… <bearer>`.
