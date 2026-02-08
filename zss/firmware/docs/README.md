# Firmware Documentation

The firmware system provides the command vocabulary for the Zed Software System (ZSS) — a game engine and creative coding environment. Each firmware module defines a set of commands that can be invoked from user-written code (codepages) or from the command-line interface.

## Architecture Overview

Firmware modules are created via `createfirmware()` from `zss/firmware.ts` and can optionally define:

- **Commands** — Named handlers invoked when the user types `#commandname args`
- **get/set hooks** — Custom variable access for the chip's execution context
- **everytick/aftertick** — Per-tick lifecycle callbacks

Commands are composed into **drivers** based on context (CLI, LOADER, RUNTIME). The runner (`runner.ts`) orchestrates which firmwares are active for each driver type.

## Module Index

| File | Purpose |
|------|---------|
| [firmware-core.md](firmware-core.md) | Core firmware factory and types (`zss/firmware.ts`) |
| [audio.md](audio.md) | Audio synthesis, playback, TTS, and effects |
| [board.md](board.md) | Board creation, element placement, shooting, duplication |
| [cli.md](cli.md) | Command-line interface, book/page management, export, multiplayer |
| [element.md](element.md) | Element stats, movement, lifecycle, and code execution |
| [loader.md](loader.md) | File loading (text, JSON, binary) and loader context |
| [loaderbinary.md](loaderbinary.md) | Binary file parsing (typed reads) |
| [loaderjson.md](loaderjson.md) | JSON parsing with JMESPath |
| [loadertext.md](loadertext.md) | Text file parsing (line-by-line, regex) |
| [network.md](network.md) | HTTP fetch commands |
| [runner.md](runner.md) | Driver composition and firmware orchestration |
| [runtime.md](runtime.md) | Runtime messaging, UI, and gadget integration |
| [transforms.md](transforms.md) | Board transformations (snapshot, copy, remix, weave, pivot) |

## Driver Types

- **CLI** — User input driving software/terminal state (cli + standardlib)
- **LOADER** — Importing external content into books (loader + standardlib)
- **RUNTIME** — Codepage execution driving engine and UI (runtime + standardlib)

**Standard library** (shared across drivers): `audio`, `board`, `network`, `transform`, `element`
