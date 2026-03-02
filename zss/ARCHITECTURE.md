# ZSS Architecture Overview

## Domain Boundaries

```
cafe/           Application Layer - React app entry, bootup
screens/        High-level UI - Tape, Terminal, Panel, Editor, Inspector
gadget/         Engine/Core - Display, Graphics, Data, Hooks
memory/         Domain Logic - Boards, Elements, Inspection
words/          Domain Types - COLOR, NAME, STAT_TYPE, parsers
device/         Infrastructure - API, Session, VM, Forward
firmware/       Infrastructure - Loader, Runtime
feature/        Feature Modules - ROM, Parse, Heavy (AI), Synth
mapping/        Utilities - Pure functions (array, string, number, 2d, etc.)
```

## Layer Dependencies

- **cafe** and **screens** depend on gadget, memory, device
- **gadget** depends on memory, words, mapping
- **memory** depends on words, mapping
- **words** depends on mapping
- **feature** modules depend on device, memory, gadget as needed
- **mapping** has no internal zss dependencies (pure utilities)

## Key Modules

| Module | Purpose |
|--------|---------|
| `words/` | Domain enums (COLOR, COLLISION, STAT_TYPE), parsers (color, dir, kind), textformat |
| `mapping/` | Pure helpers: array, string, number, 2d, types, value, guid, anim, tick, qr, func |
| `memory/` | Board/element operations, inspection, books, codepage |
| `gadget/` | Rendering engine, state, display, graphics components |
