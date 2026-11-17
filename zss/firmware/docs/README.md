---
title: Firmware Documentation
---

Blume landing page: [Overview](index.mdx) (`/docs/firmware`) — generated A–Z `#command` table with where-badges (`yarn task docs`).

The firmware system provides the `#command` vocabulary for ZSS. Modules register handlers via `createfirmware()`; [`runner.ts`](../runner.ts) composes them into CLI, LOADER, and RUNTIME drivers.

## Module index

Published under `/docs/firmware` (same order as Overview Modules):

| File | Purpose |
|------|---------|
| [index.mdx](index.mdx) | Overview (drivers + full command table; generated) |
| [audio.md](audio.md) | Audio synthesis, playback, TTS, and effects |
| [board.md](board.md) | Board creation, element placement, shooting, duplication |
| [cli.md](cli.md) | Command-line interface, book/page management, export, multiplayer |
| [element.md](element.md) | Element stats, movement, lifecycle, and code execution |
| [loader.md](loader.md) | File loading + `loader/text|json|binary|media` handlers |
| [network.md](network.md) | HTTP fetch commands |
| [runtime.md](runtime.md) | Runtime messaging, UI, and gadget integration |
| [transforms.md](transforms.md) | Board transformations (snapshot, copy, remix, weave, pivot) |

Repo only (not published): [firmware-core.md](firmware-core.md), [runner.md](runner.md), [loadertext.md](loadertext.md), [loaderjson.md](loaderjson.md), [loaderbinary.md](loaderbinary.md).

## Driver types

- **CLI** — User input driving software/terminal state (cli + standardlib)
- **LOADER** — Importing external content into books (loader + standardlib)
- **RUNTIME** — Codepage execution driving engine and UI (runtime + standardlib)

**Standard library** (shared across drivers): `audio`, `board`, `network`, `transform`, `element`
