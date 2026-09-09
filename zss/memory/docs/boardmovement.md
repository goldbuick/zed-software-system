---
title: boardmovement.ts
---

**Purpose**: Movement and collision — check blocked, move object, push chain, send messages on touch/shot. Orchestrates movement with gamesend and player exits. Blocked-walk `:thud` is emitted by element firmware everytick, not here.

## Dependencies

- `zss/mapping/guid` — ispid
- `zss/mapping/tick` — TICK_FPS
- `zss/mapping/types` — MAYBE, ispresent
- `zss/words/dir` — dirfrompts, ptapplydir
- `zss/words/reader` — READ_CONTEXT
- `zss/words/types` — COLLISION, PT
- `./boardaccess` — memoryboardelementindex, memoryreadobject, memoryreadobjectatpt, memoryreadterrain
- `./boardelement` — memoryboardelementisobject
- `./boardlifecycle` — memorydeleteboardobject, memorysafedeleteelement
- `./boards` — memorycheckelementpushable, memoryreadelementstat
- `./boardtransitions` — memoryplayerblockedbyedge, memoryplayerwaszapped
- `./gamesend` — memorysendtoelement
- `./spatialqueries` — memorycheckcollision

> **Cross-board moves** use [`memorymoveplayertoboard`](../playermanagement.ts) on the sim VM. Firmware `#goto` and edge exits call it directly; main-thread code may emit [`vmplayermovetoboard`](../../device/api.ts) → `vm:playermovetoboard`.

## Exports

| Export | Description |
|--------|-------------|
| `memorycheckblockedboardobject` | Returns blocking element or edge phantom |
| `memorycheckmoveboardobject` | True if dest is blocked |
| `memorycleanupboard` | Remove objects marked removed > 5s |
| `memorymoveboardobject` | Move object by x/y; return blocked or undefined |
| `memorymoveobject` | Full move with push chain and send (touch/shot); no thud |
| `BOOK_RUN_ARGS` | Tick/draw run arg type |
