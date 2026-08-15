# YouTube relay — Tauri v2 target

Rust + system webview shell that replaces Electron for the same product contract:

- WHIP `https://127.0.0.1:8889/cafe/whip`
- MediaMTX + ffmpeg from `vendor/` / bundled resources
- Tray + settings UI (same ZNS chrome under `src/renderer`)

Windows NSIS installers on tag releases are signed via [SignPath OSS](../../../docs/desktop-signing.md) (`youtube-relay-nsis`) when `SIGNPATH_API_TOKEN` and `SIGNPATH_ORG_ID` are set on the repo.

## Prerequisites

- Rust toolchain
- [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS
- `openssl` on PATH (localhost cert)
- `yarn fetch-binaries` from `ops/youtube-rtmp-relay` so `vendor/` exists

## Dev

```bash
cd ops/youtube-rtmp-relay
yarn install
yarn fetch-binaries
yarn start
```

Requires **openssl** on PATH once (generates localhost SAN cert), Rust, and [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/). The Tauri CLI ships via `@tauri-apps/cli` in this package (no `cargo install tauri-cli`).

## Build

```bash
yarn tauri build
```
