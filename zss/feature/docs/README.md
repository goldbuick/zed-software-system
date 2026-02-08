# Feature Documentation

The feature system provides domain-specific capabilities for the Zed Software System (ZSS) — board operations, file parsing, TTS, networking, data formatting, ROM/help content, and more. These modules are consumed by firmware, device, memory, and UI layers.

## Architecture Overview

Feature modules are **stateless utilities** and **domain logic** that:

- **Board operations** — Copy, pivot, snapshot, remix, weave (used by `zss/firmware/transforms`)
- **Format** — Object serialization with msgpack for memory/gadget state
- **Parse** — File format parsers (ZZT, ANSI, CHR, ZZM, markdown, etc.)
- **heavy** — ML/TTS workloads (Piper, Kitten TTS; transformers models; agent)
- **ROM** — Embedded help/documentation content
- **Synth** — Audio synthesis (see [synth/docs](../synth/docs/README.md))
- **WriteUI** — Terminal log formatting (headers, sections, hyperlinks)

## Module Index

| File / Folder | Purpose |
|---------------|---------|
| [boardcopy.md](boardcopy.md) | Copy board region, mapelementcopy |
| [boardpivot.md](boardpivot.md) | Rotate board region by degrees |
| [boardsnapshot.md](boardsnapshot.md) | Snapshot/revert board state |
| [boardremix.md](boardremix.md) | Wavefunction collapse remix |
| [boardweave.md](boardweave.md) | Shift/wrap board region |
| [format.md](format.md) | Object formatting and msgpack serialization |
| [netterminal.md](netterminal.md) | Peer-to-peer terminal via PeerJS |
| [tts.md](tts.md) | Text-to-speech (Edge, Piper, Kitten) |
| [heavy.md](heavy.md) | Heavy processing (TTS engines, models, agent) |
| [parse.md](parse.md) | File parsing (ZIP, ZZT, ANSI, CHR, ZZM, markdown) |
| [rom.md](rom.md) | ROM/help content and scroll display |
| [writeui.md](writeui.md) | Terminal log helpers (write, header, section, hyperlink) |
| [bytes.md](bytes.md) | Palette and charset loading from bytes |
| [url.md](url.md) | URL shortening, BBS, Museum of ZZT |
| [storage.md](storage.md) | IndexedDB config, history, content |
| [palette.md](palette.md) | Default color palette |
| [charset.md](charset.md) | Default character set |
| [keyboard.md](keyboard.md) | Clipboard, keyboard utilities |
| [speechtotext.md](speechtotext.md) | Speech recognition |
| [fetchwiki.md](fetchwiki.md) | GitHub wiki fetch |
| [itchiopublish.md](itchiopublish.md) | itch.io publishing |
| [synth/docs](../synth/docs/README.md) | Audio synthesis (full docs) |

## Submodules

- **synth** — Web-based synthesizer with Tone.js; see [synth/docs/README.md](../synth/docs/README.md)
- **heavy** — Piper/Kitten TTS, transformers models, agent with tool calls
- **parse** — Format-specific parsers; dispatches from `parse/file.ts`
- **rom** — Static `.txt` content for editor commands, help, ref scrolls
