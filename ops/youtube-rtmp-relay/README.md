# Zed Cafe YouTube Relay

Electron tray app that accepts **WHIP** from [zed.cafe](https://zed.cafe) and pushes **RTMPS** to YouTube. The YouTube stream key stays in this app only.

## Download

Installers are attached to the same GitHub **`v*`** Releases as the headless server:

https://github.com/goldbuick/zed-software-system/releases/latest

- macOS: `.dmg` (arm64 / x64)
- Windows: `.exe` (x64)

Gatekeeper / SmartScreen may warn until builds are signed. Use Open Anyway / Run anyway on first launch.

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

Requires **openssl** on PATH once (generates localhost SAN cert).

If `electron.app` is undefined when starting, unset `ELECTRON_RUN_AS_NODE` (the `yarn start` script does this).

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
