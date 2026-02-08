# itchiopublish.ts

**Purpose**: Create a ZIP file for itch.io publishing. Contains a single `index.html` that redirects to zed.cafe with the exported books hash.

## Dependencies

- `file-saver` — saveAs
- `jszip` — JSZip

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `itchiopublish` | `filename`, `exportedbooks` | Create ZIP with `index.html`; HTML redirects to `https://zed.cafe/#{exportedbooks}`; triggers download as `{filename}.zip` |

## ZIP Contents

- `index.html` — Minimal HTML with `<script>location = 'https://zed.cafe/#...';</script>`

## Consumed By

- `zss/device/register.ts` — export/publish flow
