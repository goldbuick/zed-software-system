# Media Stream companion

Electron multi-destination streaming companion for [zed.cafe](https://zed.cafe). Sibling of [`ops/media-queue/`](../media-queue/).

## What it does

- Stable PeerJS id `ms_<infohash>` on `terminal.zed.cafe`
- Receives cafe canvas + audio over PeerJS `MediaConnection`
- Configures Twitch (eRTMP), YouTube, and TikTok destinations in the app UI
- Drag a 9:16 crop frame on the H preview for Dual Format vertical
- Live vs VOD audio buses (board-TV audio excluded from VOD)
- Go-live with **Start** in the app; cafe `#broadcast stop` can end streaming

## Cafe CLI

```text
#broadcast stream <peerid>
#broadcast ms_<peerid>
#broadcast stop
```

Configure destinations and Start only in this Electron app.

## Dev

```bash
yarn task run mediastream:dev
```

## Build

```bash
yarn task run mediastream:build:desktop
```
