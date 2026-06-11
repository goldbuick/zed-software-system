# boardoperations.ts (and friends)

> The original `boardoperations.ts` was split into smaller modules. This page is a per-area cross-reference.

The current `boardoperations.ts` only re-exports `memoryfreeboardelementsruntime(board)` (frees per-element runtime entries when a board is destroyed). Everything else lives in:

| Area | Module |
|------|--------|
| Per-element / per-point reads | [`boardaccess.ts`](../boardaccess.ts) — `memoryboardelementindex`, `memoryreadelement`, `memoryreadterrain`, `memoryreadobject`, `memoryreadobjects`, `memoryreadelementbyidorindex`, `memoryfindboardplayer`, `memoryreadplayersonboard`, `memoryreadidorindex` |
| Element kind / stat / push checks / write-from-kind | [`boards.ts`](../boards.ts) — `memoryreadelementkind`, `memoryreadelementstat`, `memorycheckelementpushable`, `memorywriteelementfromkind`, `memorywritebullet` |
| Board lookup / over / under / evaldir / init | [`boards.ts`](../boards.ts) — `memoryreadboardbyaddress`, `memoryreadoverboard`, `memoryreadunderboard`, `memoryreadboardbyevaldir`, `memoryinitboard` |
| Direction evaluation (BY / AT / FLOW / SEEK / RND / AWAY / TOWARD / WITHIN / AWAYBY / ELEMENTS) | [`boarddirection.ts`](../boarddirection.ts) — `memoryevaldir` |
| Board / object create, delete, import / export | [`boardlifecycle.ts`](../boardlifecycle.ts) — `memorycreateboard`, `memorycreateboardobject`, `memorycreateboardobjectfromkind`, `memorydeleteboardobject`, `memorysafedeleteelement`, `memorywriteterrain`, `memorywriteterrainfromkind`, `memoryreadgroup`, `memoryexportboard(asjson)`, `memoryimportboard` |
| Board run list (tick) | [`boardtick.ts`](../boardtick.ts) — `memorytickboard(board, timestamp, rundraw, drawallowforqueue?)` (bullet → player → other → ghost ordering) |
| Visuals (over/under/charset/palette caches) | [`boardvisuals.ts`](../boardvisuals.ts) — `memoryupdateboardvisuals` |
| Per-board / per-element transient runtime | [`runtimeboundary.ts`](../runtimeboundary.ts) |
| Board lookup tables (id → pt, named indices) | [`boardlookup.ts`](../boardlookup.ts) |
| Movement (push, collision) | [`boardmovement.ts`](../boardmovement.ts) — `memorycheckblockedboardobject`, `memorycheckmoveboardobject`, `memorymoveboardobject`, `memorymoveobject`, `memorycleanupboard` |
| Edge / corner-exit detection | [`boardtransitions.ts`](../boardtransitions.ts), [`boardcornerexits.ts`](../boardcornerexits.ts) |
| Lighting | [`boardlighting.ts`](../boardlighting.ts), [`lightinggeometry.ts`](../lightinggeometry.ts) |

For per-function detail see [`../EXPORTED_FUNCTIONS.md`](../EXPORTED_FUNCTIONS.md).
