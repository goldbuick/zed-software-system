# Remote headed browser (WHEP media input)

Local **headed Chromium** that cafe can navigate and **watch as a media input**. This is not outbound `#broadcast` to YouTube or Twitch.

Cafe is the **WHEP player**. This process is the **tab-capture publisher**.

## Run

From the repo (uses root `playwright`):

```bash
cd ops/remote-browser
yarn start
```

Needs a display (headed). Optional: `PLAYWRIGHT_CHANNEL=chrome` to use installed Chrome.

On first start, openssl writes a localhost cert under `~/.zedcafe-remote-browser/tls/`. Trust it so `https://zed.cafe` can fetch `https://127.0.0.1:8890`. macOS/Windows try to install trust automatically.

The process prints a **bearer**. Keep it for cafe.

## Cafe

```text
#browser attach <bearer>
#browser goto https://example.com
#browser watch
```

Or one shot:

```text
#media whep browser <bearer>
```

`#browser watch` pulls WHEP from `https://127.0.0.1:8890/whep` and shows the tab on the tape overlay (cancel stops it). `#media stop` also stops.

Navigation (after attach):

```text
#browser click 400 300
#browser type hello
#browser back
#browser status
```

## Limits

- HTTPS cafe pages cannot talk to an HTTP sidecar; this process is HTTPS on `127.0.0.1:8890` on purpose.
- Widevine / some DRM tabs can capture as black frames.
- Cloudflare Workers cannot run this. It is a local (or VM-with-display) Chromium.

See [ops/docs/remote-browser-webrtc.mdx](../docs/remote-browser-webrtc.mdx).
