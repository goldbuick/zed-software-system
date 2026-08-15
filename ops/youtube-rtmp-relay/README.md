# Zed Cafe YouTube Relay

Local tray app that accepts **WHIP** from [zed.cafe](https://zed.cafe) and pushes **RTMPS** to YouTube. The YouTube stream key stays in this app only.

Packaged with **Tauri v2** (`src-tauri/`). Shared desktop stack with the media-queue helper ([design](../docs/local-media-helpers-tauri.mdx)).

## Download

Installers are attached to the same GitHub **`v*`** Releases as the headless server:

https://github.com/goldbuick/zed-software-system/releases/latest

- macOS: `.dmg` (arm64 / x64)
- Windows: `.exe` (x64, NSIS)

macOS Gatekeeper may warn until Apple Developer ID signing is configured. Windows installers are signed via [SignPath OSS](https://signpath.io/solutions/open-source-community) when release secrets are set ([`ops/docs/desktop-signing.md`](../docs/desktop-signing.md)); otherwise use Run anyway on first SmartScreen prompt.

## Use

1. Open the app (tray + settings window).
2. Paste your **YouTube stream key** and Save.
3. Copy the **local bearer**.
4. Click **Start relay** (trusts a local HTTPS cert for `127.0.0.1` once).
5. In cafe (operator):

```text
#broadcast whip youtube <local-bearer>
```

6. Stop in the app or `#broadcast stop` in cafe.

WHIP URL (fixed): `https://127.0.0.1:8889/cafe/whip`

## Dev

```bash
cd ops/youtube-rtmp-relay
yarn install
yarn fetch-binaries
yarn start
```

Requires **openssl** on PATH once (generates localhost SAN cert) and Rust + [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/). `yarn install` pulls `@tauri-apps/cli` (no global `cargo tauri` needed).

## Build installers

```bash
yarn task run relay:build:desktop
# or from this folder:
yarn dist:mac   # on macOS
yarn dist:win   # on Windows
```

Pinned MediaMTX / ffmpeg binaries are fetched into `vendor/` (gitignored) at build time.

## Visuals

ZNS / EGA chrome: DKBLUE field, cyan labels, green Start, IBM EGA 8x14, cafe favicon tray mark.
