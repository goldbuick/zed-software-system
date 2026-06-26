# Wanix shipped guests

Static Go js/wasm binaries bundled with zed.cafe (Vite `publicDir`).

| File | Build |
|------|-------|
| `zed-cafe.wasm` | `yarn task run wanix:zed-cafe:build` |

Loaded at `/wanix/zed-cafe.wasm` via `<wanix-bind type="file">` by the hidden `zed-cafe` gojs export daemon.
