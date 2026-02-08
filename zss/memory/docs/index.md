# index.ts

**Purpose**: Main memory API — MEMORY singleton, book/codepage/element/board lifecycle. Orchestrates board init, element creation, flags, and software slots.

## Dependencies

- `zss/device/api` — apilog
- `zss/device/session` — SOFTWARE
- `zss/mapping/*` — guid, tick, 2d, array, types
- `zss/words/*` — dir, kind, types
- `./boardelement` — memoryapplyboardelementcolor
- `./boardlookup` — memoryresetboardlookups, memorywriteboard*
- `./boardoperations` — memorycreateboardobjectfromkind, memorywriteterrainfromkind
- `./bookoperations` — memorycreatebook, memorylistcodepage*, memory*bookflags
- `./codepageoperations` — memoryreadcodepagedata, memoryreadcodepagestat, memoryreadcodepagetype

## Key Exports

| Category | Exports |
|----------|---------|
| Session | memoryreadsession, memoryreadoperator, memorywriteoperator, memoryreadtopic, memorywritetopic |
| Halt | memorywritehalt, memoryreadhalt |
| Loaders | memoryreadloaders, memorystartloader |
| Books | memoryreadbooklist, memoryreadbookbyaddress, memorywritebook, memoryresetbooks |
| Software | memorywritesoftwarebook, memoryreadbookbysoftware, memoryensuresoftwarebook |
| Codepages | memorypickcodepagewithtype, memorylistcodepagewithtype, memoryensuresoftwarecodepage |
| Elements | memoryreadelementkind, memoryreadelementstat, memorywriteelementfromkind, memorywritebullet |
| Boards | memoryreadboardbyaddress, memoryreadoverboard, memoryreadunderboard |
| Flags | memoryreadflags, memoryhasflags, memoryclearflags |
| Init | memoryinitboard |
