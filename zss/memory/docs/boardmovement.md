---
title: boardmovement.ts
---

**Purpose**: Movement and collision — check blocked, move object, push chain, send messages on touch/partytouch/shot. Orchestrates movement with gamesend and player exits. Blocked-walk `:thud` is emitted by element firmware everytick, not here.

**Contact**: Intent to enter a cell that holds a non-bullet object dual-emits contact **whether a push succeeds or fails**. Player movers pass `'touch'` (same-party remap in gamesend); non-player object movers pass literal `'partytouch'`. Still-blocked edge/bullet/shot handling does not re-emit touch/partytouch for a pair already contacted. Push chains dual-emit at each hop; the root mover also contacts every successfully moved deeper pushee.

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
- `./gamesend` — memorybulletcollisionlabel, memorysendtoelement
- `./spatialqueries` — memorycheckcollision

> **Cross-board moves** use [`memorymoveplayertoboard`](../playermanagement.ts) on the sim VM. Firmware `#goto` and edge exits call it directly; main-thread code may emit [`vmplayermovetoboard`](../../device/api.ts) → `vm:playermovetoboard`.

## Exports

| Export | Description |
|--------|-------------|
| `memorycheckblockedboardobject` | Returns blocking element or edge phantom |
| `memorycheckmoveboardobject` | True if dest is blocked |
| `memorycleanupboard` | Remove objects marked removed > 5s |
| `memorymoveboardobject` | Move object by x/y; return blocked or undefined |
| `memorymoveobject` | Full move with push chain and send (touch/partytouch/shot); soft-deletes `@isbreakable` ISBULLET on block |
| `BOOK_RUN_ARGS` | Tick/draw run arg type |
