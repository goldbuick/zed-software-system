# Media queue Tauri (Rust)

Scaffold for **Zed Cafe Media Queue** (`cafe.zed.media-queue`).

```bash
cd ops/media-queue/src-tauri
cargo check
cargo tauri dev
```

UI lives in [`../ui/`](../ui/). Invokes: `get_state`, `set_cafe_peer_id`, `open_browser`, `close_browser`.
