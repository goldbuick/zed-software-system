# Museum of ZZT — vanilla ZZT corpus

Offline mirror of **vanilla ZZT world** archives from [Museum of ZZT](https://museumofzzt.com/file/browse/), filtered to exclude Weave ZZT and Super ZZT content.

## Layout

| Path | Committed | Purpose |
|------|-----------|---------|
| `manifest.json` | yes | Metadata for every included archive |
| `archives/{letter}/{filename}` | no (gitignored) | Original museum ZIP downloads |

## Filter rules

An archive is included when:

- Museum `details` includes **ZZT World**
- Museum `details` does **not** include **Weave ZZT World**, **Super ZZT World**, or **Super ZZT Board**
- `archive_name` does **not** start with `wzzt_` or `szzt_`

Dual-tagged compilations (e.g. ZZT + Super ZZT in one ZIP) are excluded.

## Tasks

```bash
# Crawl catalog + write manifest (fast, no downloads)
yarn task run content:zzt:corpus:manifest

# Full crawl + download (resumable; skips files matching museum MD5 checksum)
yarn task run content:zzt:corpus:sync

# Resume download from existing manifest (skip catalog crawl)
yarn task run content:zzt:corpus:sync use-manifest

# Smoke test: download first 5 archives only
yarn task run content:zzt:corpus:sync limit 5

# Force re-download
yarn task run content:zzt:corpus:sync force
```

## API

- Catalog: `GET https://museumofzzt.com/api/v1/search/files/?offset=N`
- Download: `GET https://museumofzzt.com/zgames/{letter}/{filename}`

See [Museum API v1](https://museumofzzt.com/api/) and in-app integration in `zss/feature/url.ts`.

## Estimated size

~3,500–4,500 vanilla ZZT archives; hundreds of MB total in `archives/`.
