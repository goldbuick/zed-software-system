# Dev-served public fixtures

Static assets served at **`/fixtures/`** during `yarn task app dev` (Vite middleware maps this tree to the cafe URL prefix `/fixtures`, not `cafe/public/`).

Use for harness pages and other ops-owned assets that need browser URLs without living in `cafe/public/`.

| Example URL | File |
|-------------|------|
| `/fixtures/wanix/vm-simple.html` | `wanix/vm-simple.html` (when placed here) |

See also: `/renders/` (offline audio), `/wanix/` (wanix harness shortcut).
