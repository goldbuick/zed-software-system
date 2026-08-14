# YouTube relay — Tauri v2 target

Rust + system webview shell that replaces Electron for the same product contract:

- WHIP `https://127.0.0.1:8889/cafe/whip`
- MediaMTX + ffmpeg from `vendor/` / bundled resources
- Tray + settings UI (same ZNS chrome under `src/renderer`)

## Prerequisites

- Rust toolchain
- [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS
- `openssl` on PATH (localhost cert)
- `yarn fetch-binaries` from `ops/youtube-rtmp-relay` so `vendor/` exists

## Dev

```bash
cd ops/youtube-rtmp-relay
yarn fetch-binaries
cargo install tauri-cli --version "^2" --locked   # once
cargo tauri dev
```

The frontend lives in `../ui` (`withGlobalTauri`). Electron keeps using `../src/renderer` until it is removed.

## Build

```bash
cargo tauri build
```

Wire `relay:build:desktop*` to this CLI when Electron is retired ([design](../docs/local-media-helpers-tauri.mdx)).
