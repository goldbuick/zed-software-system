# boardmovement.ts

**Purpose**: Movement and collision — check blocked, move object, push chain, send messages on touch/shot/thud. Orchestrates movement with gamesend and player exits.

## Dependencies

- `zss/mapping/guid` — ispid
- `zss/mapping/tick` — TICK_FPS
- `zss/words/dir` — dirfrompts, ptapplydir
- `zss/words/types` — COLLISION, PT
- `./boardaccess` — memoryboardelementindex, memoryreadobject, memoryreadterrain
- `./boardelement` — memoryboardelementisobject
- `./boardlifecycle` — memorydeleteboardobject
- `./boards` — memorycheckelementpushable, memoryreadelementstat
- `./boardtransitions` — memoryplayerblockedbyedge, memoryplayerwaszapped
- `./gamesend` — memorysendtoelement
- `./runtimeboundary` — memoryreadboardruntime (for the cached `lookup` table)
- `./spatialqueries` — memorycheckcollision

> **Cross-board moves** are not in this module any more. The boardrunner asks the sim VM via `vm:playermovetoboard` ([`vmplayermovetoboard`](../../device/api.ts)), which calls [`memorymoveplayertoboard`](../playermanagement.ts).

## Exports

| Export | Description |
|--------|-------------|
| `memorycheckblockedboardobject` | Returns blocking element or edge phantom |
| `memorycheckmoveboardobject` | True if dest is blocked |
| `memorycleanupboard` | Remove objects marked removed > 5s |
| `memorymoveboardobject` | Move object; update lookup; return blocked or undefined |
| `memorymoveobject` | Full move with push chain and send (touch/shot/thud) |
