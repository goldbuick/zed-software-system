# Airshare optical MEMORY transfer

Screen-to-camera transfer of compressed game MEMORY using a zed-owned fountain QR protocol. Not interoperable with [decimen.app](https://decimen.app/).

## Commands

| Command | Role |
|---------|------|
| `#airshare` / `#airshare send` | Invite QR, then stream MEMORY |
| `#airshare receive` | Camera decode and apply MEMORY |
| `#airshare stop` | Cancel either mode |

Deeplink: `?airshare=receive` auto-runs `#airshare receive` (phone camera scan of invite QR).

## UI

WebGL HUD in the gadget tree ([`zss/gadget/airshareview.tsx`](../../gadget/airshareview.tsx)): dimmed board, `CanvasTexture` QR (invite/stream) or `VideoTexture` viewfinder (receive). Tappable **ok** / **esc** (`ToggleKey`) plus keyboard OK/CANCEL. Entering airshare blurs mobile text capture and closes the terminal so the soft keyboard dismisses.

## Modules

| File | Role |
|------|------|
| [`protocol.ts`](protocol.ts) | Frame header pack/parse |
| [`fountain.ts`](fountain.ts) | Systematic carousel encode/peel |
| [`qrcapacity.ts`](qrcapacity.ts) | Block size from QR version |
| [`qrrender.ts`](qrrender.ts) | `uqr` matrix to canvas |
| [`decode.ts`](decode.ts) | `zxing-wasm` camera decode |
| [`bytes.ts`](bytes.ts) | base64url zip bytes + invite URL |
| [`focus.ts`](focus.ts) | Blur mobiletext + close terminal |
| [`state.ts`](state.ts) | Overlay mode store |
| [`docs/protocol.md`](docs/protocol.md) | Wire format spec |

Inspired by Decimen Optical Transfer's systematic-carousel idea; implementation and wire magic are independent (AGPL Decimen code is not vendored).
