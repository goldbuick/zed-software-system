---
title: Glossary
description: Terms used across Zed Cafe / ZSS — product, world model, devices, and more.
sidebar:
  order: 2
---

Definitions migrated from the former System Reference MPA. Paths point at source or colocated docs.

## Codepage types

### board page

**Audience:** Creator · **Related:** BOARD, object page

CODE_PAGE_TYPE.BOARD — defines a playable level grid and its element layout.

### object page

**Audience:** Creator · **Related:** CHIP, #bind

CODE_PAGE_TYPE.OBJECT — reusable element behavior script bound by kind name.

### terrain page

**Audience:** Creator · **Related:** BOARD, charset

CODE_PAGE_TYPE.TERRAIN — background tile definitions for board terrain layer.

### charset page

**Audience:** Creator · **Related:** display, palette

CODE_PAGE_TYPE.CHARSET — custom character glyph definitions for rendering.

### palette page

**Audience:** Creator · **Related:** COLOR, charset

CODE_PAGE_TYPE.PALETTE — color remapping table for board graphics.

### loader page

**Audience:** Creator · **Related:** LOADER driver, parse

CODE_PAGE_TYPE.LOADER — import handler script run when loading external files.

### txt page

**Audience:** Creator · **Related:** refscroll, zns

CODE_PAGE_TYPE.TXT — plain-text notes page (`@txt <name>`). No ZSS execution; ZNS renders markdown and $ zsstext colors.

## Directions & stats

### DIR

**Audience:** Creator · **Related:** collision, #go

Direction vocabulary: N/S/E/W, BY, AT, FLOW, SEEK, CW, WITHIN, BEAM, etc.

Source: [`zss/words/docs/dir.md`](https://github.com/goldbuick/zed-software-system/blob/main/zss/words/docs/dir.md)

### COLOR

**Audience:** Creator · **Related:** palette, #color

16 foreground colors plus ON variants, blink, and ONCLEAR for element display.

Source: [`zss/words/docs/color.md`](https://github.com/goldbuick/zed-software-system/blob/main/zss/words/docs/color.md)

### STAT_TYPE

**Audience:** Creator · **Related:** inspector, words

Inspector stat categories: BOARD, OBJECT, RANGE, HOTKEY, CHAREDIT, etc.

Source: [`zss/words/docs/stats.md`](https://github.com/goldbuick/zed-software-system/blob/main/zss/words/docs/stats.md)

### p1–p10

**Audience:** Creator · **Related:** BOARD_ELEMENT, #set

Generic numeric params on BOARD_ELEMENT for custom object state.

## Integrations

### ttsspace

**Audience:** Dev · **Related:** ttsspace

Lazy-spawned TTS worker for Piper, Supertonic, or Fish inference; main synth plays returned audio.

Source: [`zss/device/ttsworker.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/device/ttsworker.ts)

### sttspace

**Audience:** Dev · **Related:** speech-to-text, terminal

Lazy-spawned STT worker for Moonshine speech recognition; mic capture stays on main thread.

Source: [`zss/device/sttworker.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/device/sttworker.ts)

### TTS

**Audience:** Creator · **Related:** ttsspace, audio

Text-to-speech via Piper, Supertonic, or Fish in the ttsspace worker (#tts, #ttsengine).

Source: [`zss/feature/docs/tts.md`](https://github.com/goldbuick/zed-software-system/blob/main/zss/feature/docs/tts.md)

### ZNS

**Audience:** Creator · **Related:** export, url

Zed Name Service for publishing and listing shareable content (#zns).

Source: [`zss/feature/url.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/feature/url.ts)

### itch.io

**Audience:** Creator · **Related:** export

#itchiopublish — export and publish games to itch.io (operator).

Source: [`zss/feature/docs/itchiopublish.md`](https://github.com/goldbuick/zed-software-system/blob/main/zss/feature/docs/itchiopublish.md)

### ZZT Museum

**Audience:** Creator · **Related:** parse, import

#zztsearch / #zztrandom — browse classic ZZT worlds from museum API.

## Multiplayer

### bridge

**Audience:** Both · **Related:** joincode, modem

PeerJS device for join codes, tab join, fetch, streams, and chat bridges.

Source: [`zss/device/bridge.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/device/bridge.ts)

### joincode

**Audience:** Creator · **Related:** bridge, jointab

#joincode — operator starts multiplayer session with shareable URL.

### modem

**Audience:** Dev · **Related:** editor, bridge

Yjs CRDT sync for collaborative code editing with cursor awareness.

Source: [`zss/device/modem.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/device/modem.ts)

### Yjs

**Audience:** Dev · **Related:** modem, editor

CRDT library powering real-time collaborative tape editor sync.

### joinvm

**Audience:** Dev · **Related:** bridge, join

Join-mode stub VM on the main thread (`/join/` URL) without clock/tick; replaces sim only — boardrunner still spawns eagerly. (Older docs called this stubspace.)

Source: [`zss/device/joinvm.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/device/joinvm.ts)

## Permissions

### operator

**Audience:** Both · **Related:** permissions, role

Privileged session player identity; bypasses all permission checks.

Source: [`zss/memory/session.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/memory/session.ts)

### role

**Audience:** Both · **Related:** permissions, #role

Assignable identity: admin, mod, or player with permission group grants.

Source: [`zss/memory/permissions.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/memory/permissions.ts)

### lockdown

**Audience:** Both · **Related:** creative, #access

Permission preset restricting build, risk, and speaker commands.

### creative

**Audience:** Both · **Related:** lockdown, #access

Permission preset allowing broad build and explore for all players.

## Product

### ZSS

**Audience:** Both · **Related:** cafe, Engine

Zed Software System — the full TypeScript monolith: cafe UI, zss engine, and CLI.

Source: [`zss/ARCHITECTURE.md`](https://github.com/goldbuick/zed-software-system/blob/main/zss/ARCHITECTURE.md)

### cafe

**Audience:** Both · **Related:** ZSS, Engine

Vite/React application shell that hosts the Engine and tape UI.

Source: [`cafe/`](https://github.com/goldbuick/zed-software-system/blob/main/cafe/)

### ZED Cafe

**Audience:** Both · **Related:** cafe, lang

Product domain at zed.cafe; also a script dialect extending ZZT-OOP with structural keywords.

Source: [`zss/feature/parse/zztoop.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/feature/parse/zztoop.ts)

### Engine

**Audience:** Both · **Related:** cafe, gadget

React component that calls createplatform() and renders the R3F terminal scene.

Source: [`zss/gadget/engine.tsx`](https://github.com/goldbuick/zed-software-system/blob/main/zss/gadget/engine.tsx)

### fantasy terminal

**Audience:** Creator · **Related:** tape, gadget

The retro terminal aesthetic: boards as worlds, # commands as OS, scrolls as help.

## Runtime

### hub

**Audience:** Dev · **Related:** device, message

Pub/sub message bus per JS realm; emit fan-out invokes every device.handle.

Source: [`zss/hub.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/hub.ts)

### device

**Audience:** Dev · **Related:** hub, message

Message handler registered on a hub: vm, register, boardrunner, synth, etc.

Source: [`zss/device.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/device.ts)

### message

**Audience:** Dev · **Related:** hub, api

Routing envelope: session, player, id, sender, target, data. Target is device:path.

Source: [`zss/device/api.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/device/api.ts)

### forward

**Audience:** Dev · **Related:** hub, platform

Device that bridges hub messages across workers via postMessage.

Source: [`zss/device/forward.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/device/forward.ts)

### VM

**Audience:** Dev · **Related:** boardrunner, ticktock

Sim-worker vm device — authoritative owner of MEMORY and game tick loop.

Source: [`zss/device/vm.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/device/vm.ts)

### boardrunner

**Audience:** Dev · **Related:** election, boundary

Elected player whose worker runs chip ticks for one active board.

Source: [`zss/device/boardrunner.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/device/boardrunner.ts)

### boundary

**Audience:** Dev · **Related:** paint, patch

Opaque keyed slice of nested memory for efficient jsonpipe partial sync.

Source: [`zss/memory/boundaries.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/memory/boundaries.ts)

### paint

**Audience:** Dev · **Related:** patch, jsonpipe

Full jsonpipe snapshot sync — replaces entire boundary or gadget document.

Source: [`zss/feature/jsonpipe/README.md`](https://github.com/goldbuick/zed-software-system/blob/main/zss/feature/jsonpipe/README.md)

### patch

**Audience:** Dev · **Related:** paint, jsonpipe

Incremental RFC 6902 jsonpipe diff applied to prior snapshot state.

### jsonpipe

**Audience:** Dev · **Related:** paint, patch

Snapshot + patch protocol used for gadget, boardrunner, and boundary sync.

Source: [`zss/feature/jsonpipe/`](https://github.com/goldbuick/zed-software-system/blob/main/zss/feature/jsonpipe/)

### SOFTWARE

**Audience:** Dev · **Related:** register, VM

Session holder with convenient emit() for sending messages as the current player.

Source: [`zss/device/session.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/device/session.ts)

### register device

**Audience:** Dev · **Related:** SOFTWARE, tape

Main-thread edge translating UI events into vm:* hub messages; handles workstatus and sessionreset.

Source: [`zss/device/register.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/device/register.ts)

### desync

**Audience:** Dev · **Related:** paint, patch

Recovery path when jsonpipe patch fails; triggers full paint resync.

## Scripting

### CHIP

**Audience:** Both · **Related:** firmware, lang

Per-element script VM: compiled code, get/set stats, firmware dispatch, messaging.

Source: [`zss/chip.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/chip.ts)

### firmware

**Audience:** Both · **Related:** CHIP, #command

Registry of #commands with hooks; composed into CLI, LOADER, RUNTIME drivers.

Source: [`zss/firmware/runner.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/firmware/runner.ts)

### CLI driver

**Audience:** Both · **Related:** tape, permissions

Firmware context for terminal # input; permission checks apply.

### LOADER driver

**Audience:** Dev · **Related:** loader page, parse

Firmware context for file import handlers; no permission checks.

### RUNTIME driver

**Audience:** Both · **Related:** CHIP, element commands

Firmware context for codepage chip execution on boards.

### lang

**Audience:** Dev · **Related:** compile, CHIP

ZSS script compiler pipeline producing JS for CHIP execution.

Source: [`zss/feature/lang/backend/typescript/generator.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/feature/lang/backend/typescript/generator.ts)

### words

**Audience:** Both · **Related:** firmware, lang

Domain parsers and enums: COLOR, DIR, KIND, STAT_TYPE, collision.

Source: [`zss/words/`](https://github.com/goldbuick/zed-software-system/blob/main/zss/words/)

### #command

**Audience:** Creator · **Related:** firmware, CLI driver

Hash-prefixed firmware directive in terminal or codepages, e.g. #goto, #play.

### label

**Audience:** Creator · **Related:** CHIP, #zap

Named code block in object scripts; :touch, :shot, custom event handlers.

### send

**Audience:** Creator · **Related:** CHIP, firmware

Message dispatched between elements or to labels; core event wiring.

Source: [`zss/words/docs/send.md`](https://github.com/goldbuick/zed-software-system/blob/main/zss/words/docs/send.md)

## Simulation

### ticktock

**Audience:** Dev · **Related:** clock, VM

Primary simulation clock message; one frame of game logic per tick.

Source: [`zss/device/vm/handlers/ticktock.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/device/vm/handlers/ticktock.ts)

### election

**Audience:** Dev · **Related:** boardrunner

VM picks eligible player on each board as boardrunner; evicts on ack timeout.

Source: [`zss/device/vm/boardrunnermanagement.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/device/vm/boardrunnermanagement.ts)

### memorytickmain

**Audience:** Dev · **Related:** CHIP, boardrunner

Runs all element CHIP generators on a board for one simulation frame.

Source: [`zss/memory/runtime.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/memory/runtime.ts)

### halt

**Audience:** Both · **Related:** operator, dev

Dev mode flag that stops chip execution until cleared (#dev).

### frozen

**Audience:** Dev · **Related:** MEMORY, halt

Memory flag preventing mutation during certain operations.

### cycle

**Audience:** Creator · **Related:** CHIP, #cycle

Element tick rate divisor (1–255); lower cycle = more frequent execution.

## UI

### gadget

**Audience:** Both · **Related:** gadgetclient, layers

Render/UI projection of memory: layers, scrolls, terminal, per-player view.

Source: [`zss/gadget/data/zustandstores.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/gadget/data/zustandstores.ts)

### tape

**Audience:** Both · **Related:** CLI driver, autocomplete

Terminal input line and code editor panel with layout modes TOP/FULL/BOTTOM/MAX.

Source: [`zss/screens/tape/`](https://github.com/goldbuick/zed-software-system/blob/main/zss/screens/tape/)

### scroll

**Audience:** Creator · **Related:** ROM, #help

In-world text panel for help, lists, hyperlinks, and reference content.

Source: [`zss/gadget/docs/gadget-scrolls.md`](https://github.com/goldbuick/zed-software-system/blob/main/zss/gadget/docs/gadget-scrolls.md)

### inspector

**Audience:** Creator · **Related:** STAT_TYPE, remix

Visual editor mode (#gadget) for element stats, batch ops, and find-any.

Source: [`zss/memory/docs/inspection.md`](https://github.com/goldbuick/zed-software-system/blob/main/zss/memory/docs/inspection.md)

### layer

**Audience:** Both · **Related:** gadget, display

Render plane types: BLANK, TILES, SPRITES, DITHER, MEDIA, CONTROL.

Source: [`zss/gadget/data/types.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/gadget/data/types.ts)

### CRT

**Audience:** Creator · **Related:** display, Engine

Post-processing effects giving the display a retro monitor aesthetic.

### ROM

**Audience:** Both · **Related:** scroll, autocomplete

Built-in help markdown: editor hints, refscrolls, command documentation.

Source: [`zss/feature/docs/rom.md`](https://github.com/goldbuick/zed-software-system/blob/main/zss/feature/docs/rom.md)

## World model

### MEMORY

**Audience:** Both · **Related:** BOOK, BOARD

Singleton root of game state: books, software slots, loaders, session, operator.

Source: [`zss/memory/session.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/memory/session.ts)

### BOOK

**Audience:** Both · **Related:** CODE_PAGE, MEMORY

Container for codepages, flags, and activelist; worlds live in books.

Source: [`zss/memory/types.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/memory/types.ts)

### CODE_PAGE

**Audience:** Both · **Related:** BOOK, codepage types

Editable unit inside a book: board, object, terrain, charset, palette, or loader.

### BOARD

**Audience:** Both · **Related:** BOARD_ELEMENT, CODE_PAGE

60×25 grid world with terrain array, objects map, exits, camera, and graphics refs.

Source: [`zss/memory/types.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/memory/types.ts)

### BOARD_ELEMENT

**Audience:** Both · **Related:** CHIP, kind

Single cell occupant: kind, char, color, collision, cycle, movement, params p1–p10.

Source: [`zss/memory/types.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/memory/types.ts)

### kind

**Audience:** Creator · **Related:** BOARD_ELEMENT, CATEGORY

Named element type string used in #put, #become, collision, and lookup.

Source: [`zss/words/docs/kind.md`](https://github.com/goldbuick/zed-software-system/blob/main/zss/words/docs/kind.md)

### collision

**Audience:** Creator · **Related:** BOARD_ELEMENT, DIR

ISWALK, ISSOLID, ISSWIM, ISBULLET, ISGHOST — how elements interact physically.

Source: [`zss/words/docs/collision.md`](https://github.com/goldbuick/zed-software-system/blob/main/zss/words/docs/collision.md)

### flag

**Audience:** Both · **Related:** MEMORY, CHIP

Named boolean or value bag on books, elements, or players for script state.

Source: [`zss/memory/flags.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/memory/flags.ts)

### MEMORY_LABEL

**Audience:** Dev · **Related:** MEMORY, fork

Software slot ids: MAIN, TEMP, TITLE, PLAYER for session state routing.

Source: [`zss/memory/types.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/memory/types.ts)
