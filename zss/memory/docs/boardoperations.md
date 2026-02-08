# boardoperations.ts

**Purpose**: Board CRUD, direction evaluation, tick, pathfinding. Core board and element operations.

## Dependencies

- `zss/feature/format` — formatobject, unformatobject
- `zss/mapping/*` — 2d, array, guid, number, types
- `zss/words/dir` — EVAL_DIR, STR_DIR, dirfrompts, ptapplydir, etc.
- `zss/words/types` — COLLISION, DIR, PT
- `./boardelement` — memoryboardelementisobject, memoryexport/importboardelement
- `./boardlookup` — memorydeleteboard*, memoryinitboardlookup
- `./boardmovement` — memorycleanupboard, memorymoveboardobject
- `./bookoperations` — memoryreadelementdisplay
- `./spatialqueries` — memorylistboardnamedelements, memorypickboardnearestpt, memoryreadboardpath

## Key Exports

| Category | Exports |
|----------|---------|
| CRUD | memorydeleteboardobject, memorycreateboardobject, memorycreateboardobjectfromkind, memorywriteterrain, memorywriteterrainfromkind |
| Read | memoryboardelementindex, memoryreadelement, memoryreadelementbyidorindex, memoryreadterrain, memoryreadobject, memoryreadobjects |
| Dir | memoryevaldir (BY, AT, FLOW, SEEK, RND, AWAY, TOWARD, WITHIN, AWAYBY, ELEMENTS) |
| Export | memoryexportboard, memoryimportboard |
| Tick | memorytickboard (bullet/water → player → other → ghost) |
| Visuals | memoryupdateboardvisuals |
| Misc | memoryfindboardplayer, memoryreadgroup, memorysafedeleteelement, memorycreateboard, memoryplayerblockedbyedge, memoryplayerwaszapped |
