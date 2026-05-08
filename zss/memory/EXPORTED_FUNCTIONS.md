# Memory Module - Exported Functions Summary

<!-- When public exports under `zss/memory/` change, update this catalog. -->

The previous monolithic `index.ts` has been split into smaller modules. Per-module narratives live in [`docs/`](docs/README.md); this file is the flat function catalog.

## session.ts

The MEMORY singleton plus its book/loader/operator/topic accessors.

- **memoryreadroot()** / **MEMORY_ROOT** (type) - Reads the live MEMORY object (used by jsonpipe sync to the boardrunner)
- **memoryreadsession()** - Returns the session ID
- **memoryreadoperator()**, **memoryisoperator(player)**, **memorywriteoperator(operator)** - Operator player accessors
- **memoryreadtopic()**, **memorywritetopic(topic)** - Multiplayer topic accessors
- **memoryreadhalt()**, **memorywritehalt(halt)** - Dev/halt mode accessors
- **memoryreadsimfreeze()**, **memorywritesimfreeze(frozen)** - Sim freeze gate (skips the VM tick when true)
- **memoryreadloaders()**, **memorystartloader(id, code)** - Loader map accessors
- **memoryreadbooklist()**, **memoryreadfirstbook()**, **memoryreadfirstcontentbook()** - Book listing
- **memoryreadbookbyaddress(address)**, **memorywritebook(book)**, **memoryresetbooks(books)**, **memoryclearbook(address)**, **memoryfreebook(book)** - Book CRUD
- **memorywritesoftwarebook(slot, book)**, **memoryreadbookbysoftware(slot)** - Software slot (`main` / `temp`) accessors
- **SOFTWARE_SLOT** (type)

## books.ts

Higher-level book ensure helpers built on `session.ts`.

- **memorycreatesoftwarebook(maybename?)** - Creates a new software book and registers it
- **memoryensurebookbyname(name)** - Returns the matching book, creating one if missing
- **memoryensuresoftwarebook(slot, maybename?)** - Ensures the software slot has a book
- **memoryensuresoftwarecodepage(slot, address, createtype)** - Ensures the named codepage exists in a software book

## flags.ts

Per-id flag bag (boundary-backed in `MEMORY.books[*].flags`).

- **memoryreadflags(id)**, **memoryhasflags(id)**, **memoryclearflags(id)**

## boundaries.ts

Boundary store: opaque jsonpipe slices keyed by id (board, codepage runtime, chip, gadget, synth, layers, tracking, player). Used to ship slices to the boardrunner.

- **memoryboundaryget(id)**, **memoryboundaryset(id, payload)**, **memoryboundarydelete(id)**, **memoryboundaryalloc(payload, maybeid?)**, **memoryboundariesclear()**

## boundaryrouting.ts

- **memorycollectboundaryidsforboard(book, board)** - Returns the set of boundary ids that must be jsonpiped to a board's runner each tick (board id + synth/layers/tracking flags + each object's chip/player/gadget ids)

## jsonpipefilter.ts

- **memoryrootshouldemitpath(path)** - Symmetric `shouldemitpath` predicate used by every memory jsonpipe (drops runtime-only paths like `lookup` / `named`)

## boardaccess.ts

Board element / point lookups (no mutation).

- **memoryreadidorindex(element)**, **memoryboardelementindex(board, pt)**
- **memoryreadterrain(board, x, y)**, **memoryreadobject(board, id)**, **memoryreadobjectbypt(board, pt)**
- **memoryreadelement(board, pt)**, **memoryreadelementbyidorindex(board, idorindex)**
- **memoryreadobjects(board)**, **memoryreadplayersonboard(board)**
- **memoryfindboardplayer(board, target, player)**

## boards.ts

Board / element / kind reads + creators.

- **memoryreadelementkind(element)**, **memoryreadelementstat(element, stat)**, **memorycheckelementpushable(pusher, target)**
- **memorywriteelementfromkind(board, kind, dest, id?)**, **memorywritebullet(board, kind, dest)**
- **memoryreadboardbyaddress(address)**, **memoryreadoverboard(board)**, **memoryreadunderboard(board)**, **memoryreadboardbyevaldir(dir, board)**
- **memoryinitboard(board)**

## boardlifecycle.ts

Board / object create, delete, import/export.

- **memorycreateboard(fn?)**, **memorycreateboardobject(board, from)**, **memorycreateboardobjectfromkind(board, pt, kind, id?)**
- **memorydeleteboardobject(board, id)**, **memorysafedeleteelement(board, element, timestamp)**
- **memorywriteterrain(board, from)**, **memorywriteterrainfromkind(board, pt, kind)**
- **memoryreadgroup(board, self, targetgroup)**
- **memoryexportboard(board)**, **memoryexportboardasjson(board)**, **memoryimportboard(boardentry)**

## boardelement.ts

- **memorycreateboardelement()**, **memoryapplyboardelementcolor(element, strcolor)**
- **memoryboardelementisobject(element)**
- **memoryexportboardelement(boardelement)**, **memoryexportboardelementasjson(boardelement)**, **memoryimportboardelement(boardelemententry)**

## boardlookup.ts

Lookup tables (object id → pt, named indices).

- **memorywriteboardnamed**, **memorywriteboardobjectlookup**
- **memorydeleteboardobjectnamedlookup**, **memorydeleteboardterrainnamed**
- **memoryresetboardlookups(board)**, **memoryinitboardlookup(board)**

## boardmovement.ts

- **memorycheckblockedboardobject(board, collision, dest, isplayer?)**, **memorycheckmoveboardobject(board, target, dest)**
- **memorymoveboardobject(board, element, dest)**, **memorymoveobject(book, board, element, dest, didpush?)**
- **memorycleanupboard(board, timestamp)**

## boarddirection.ts

- **memoryevaldir(board, element, player, dir, startpt)** - Resolves direction commands (`n`/`rndne`/`flow` / etc.) into destination points

## boardstatequery.ts

- **BOARDSTATE_DATA** (type)
- **memoryreadboardstatequery(...)** - Aggregated board snapshot used by the inspect query system

## boardtick.ts

- **memorytickboard(board, timestamp, rundraw, drawallowforqueue?)** - Builds the per-tick run list for chips on a board

## boardtransitions.ts

Edge / corner-exit detection used by `boardrunner` board hops.

## boardvisuals.ts

- **memoryupdateboardvisuals(board)** - Refreshes over/under/charset/palette caches

## boarddrawdirty.ts

- **memoryupdatedrawdirty(board, timestamp)** - Promotes per-tick "draw" markings into the next tick's runtime hints

## boardarraypool.ts

- **acquireboardsizearray(fill)**, **releaseboardsizearray(arr)** - Pool for `BOARD_WIDTH * BOARD_HEIGHT` numeric scratch buffers

## boardlighting.ts / lightinggeometry.ts

Dark-board lighting:

- `boardlighting.ts` — **memoryboardlightingapplyobject**, **memoryboardlightingmarkplayer**
- `lightinggeometry.ts` — **lightingmixmaxrange**, **memorylightingaddrangetoblocked**, plus `LightingOccluderKind`, `LIGHTING_*` constants

## boardcornerexits.ts

Helper used by [`memoryreadboardbyevaldir`](boards.ts) and edge transitions.

## bookoperations.ts

Book / codepage / flag operations.

- **memoryreadcodepage(book, address)**, **memoryreadcodepagewithtype(book, type, address)**
- **memoryreadelementcodepage(book, element)**, **memoryreadelementdisplay(element, ...)**
- **memorylistcodepagebytype(book, type)**, **memorylistcodepagebystat(book, statname)**, **memorylistcodepagebytypeandstat(book, type, statname)**, **memorylistcodepagedatabytype(book, type)**, **memorylistcodepagessorted(book)**
- **memorywritecodepage(book, codepage)**, **memoryclearbookcodepage(book, address)**
- **memoryensurebookcodepagewithtype(book, type, address)**
- **memoryreadbookflag**, **memoryreadbookflags**, **memorywritebookflag**, **memoryhasbookflags**, **memoryclearbookflags**, **memoryhasbookmatch**
- **memoryupdatebookname(book)**, **memoryupdatebooktoken(book)**
- **memorycreatebook(pages)**, **memoryexportbook(book)**, **memoryexportbookasjson(book)**, **memoryimportbook(bookentry)**, **memoryimportbookfromjson(flat)**

## codepages.ts

Codepage discovery across books.

- **memorylistallcodepagewithtype(type)**, **memorylistcodepagewithtype(type)**
- **memoryreadcodepagebyid(address)**, **memorypickcodepagewithtypeandstat(type, address)**

## codepageoperations.ts

Codepage parse / runtime.

- **memoryreadcodepageruntime(codepage)**, **memoryensurecodepageruntime(codepage)**
- **memoryapplyelementstats(stats, element)**
- **memoryreadcodepagedata(codepage)**, **memoryreadcodepagename(codepage)**, **memoryreadcodepagetype(codepage)**, **memoryreadcodepagetypeasstring(codepage)**
- **memoryreadcodepagestat(codepage, stat)**, **memoryreadcodepagestats(codepage)**, **memoryreadcodepagestatdefaults(codepage)**, **memoryreadcodepagestatsfromtext(content)**, **memoryresetcodepagestats(codepage)**
- **memorycodepagetypetostring(type)**, **memorycodepagehasmatch(codepage, type, ids)**
- **memorycreatecodepage(code, content)**, **memoryfreecodepage(codepage)**
- **memoryexportcodepage**, **memoryexportcodepageasjson**, **memoryimportcodepage**, **memoryimportcodepagefromjson**
- **memoryexportbitmap**, **memoryimportbitmap**

## runtimeboundary.ts

Per-board / per-element transient runtime state stored in the boundary map.

- **memoryensureboardruntime(board)**, **memoryreadboardruntime(board)**, **memorywriteboardruntime(...)**, **memorydeleteboardruntime(board)**
- **memoryensureboardelementruntime(...)**, **memoryreadboardelementruntime(...)**, **memorywriteboardelementruntime(...)**, **memorydeleteboardelementruntime(...)**

## boardoperations.ts

- **memoryfreeboardelementsruntime(board)** - Frees element-runtime entries for every object on a board

## runtime.ts

Chip OS / tick loop.

- **memorygc()**, **memoryhaltchip(id)**, **memoryrestartallchipsandflags()**, **memorymessagechip(message)**
- **memoryrepeatclilast(player)**, **memoryruncli(player, cli, tracking?)**
- **memorytickloaders()** - Runs all queued loaders (sim VM only)
- **memorytickmain(timestamp, boards, playeronly?)** - Runs one tick across the supplied boards (called by both the sim VM and the boardrunner)
- **memorytickobject(book, board, object, code)**, **memorytickonce(book, board, element, code, id, label)**
- **memoryruncodepage(address, label)**
- **memoryunlockscroll(id, player)**
- **memoryapplyboardsynthstats(board)**

## playermanagement.ts

- **memorymoveplayertoboard(book, player, board, dest)** - Authoritative move (called by [`vm:playermovetoboard`](../device/vm/handlers/playermovetoboard.ts))
- **memoryreadbookplayeractive(book, player)**, **memoryreadplayeractive(player)**, **memoryreadplayerboard(player)**, **memoryreadbookplayerboards(book)**
- **memorywritebookplayerboard(book, player, board)**
- **memoryloginplayer(player, stickyflags)**, **memorylogoutplayer(player, isendgame)**
- **memoryscanplayers(players)**

## gamesend.ts

- **memorysendtoboards(target, message, data, boards)**, **memorysendtoelement(fromelement, toelement, label)**, **memorysendtoelements(chip, fromelement, send)**, **memorysendtolog(board, element, text)**

## loader.ts

- **memoryloader(arg, format, idoreventname, content, player)** - Runs every loader matching the format/event
- **memoryloaderarg(id)**, **memoryloadercontent(id)**, **memoryloaderdone(id)**, **memoryloaderformat(id)**, **memoryloadermatches(format, idoreventname)**, **memoryloaderplayer(id)**

## rendering.ts

Memory → gadget layer conversion.

- **memorycodepagetoprefix(codepage)**, **memoryelementtodisplayprefix(element)**, **memoryelementtologprefix(element)**, **memoryelementtotickerprefix(element)**
- **memoryconverttogadgetcontrollayer(player, index, board)**, **memoryconverttogadgetlayers(player, index, board, tickers, whichlayer, multi?)**
- **memoryreadgadgetlayers(mode, board)**, **memoryreadgraphics(player, board)**
- **MEMORY_GADGET_LAYERS** (type)

## renderinglayercache.ts

Pooled sprite / dither / control / tile builders for [`gadgetsynctick`](../device/vm/gadgetsynctick.ts).

- **memorycreatecachedsprite**, **memorycreatecachedsprites**
- **createcacheddither**, **createcachedmedia**, **createcachedcontrol**, **createcachedtiles**

## gadgetlayersflags.ts

- **memoryreadbookgadgetlayersforboard(book, boardid)** - Returns the per-board cached gadget layer store keyed by graphics variant

## lookstatequery.ts

- **memoryreadlookstatequery(agentid)** - Look-state aggregation for queries / heavy

## synthstate.ts

- **memoryreadsynth(board)**, **memoryreadsynthplay(board)**, **memoryqueuesynthplay(board, play)**
- **memorymergesynthvoice(board, idx, config, value)**, **memorymergesynthvoicefx(board, idx, fx, config, value)**

## spatialqueries.ts

- **memorycheckcollision(source, dest)**, **memoryfindplayerforelement(board, elementpt, player)**
- **memorylistboardelementsbycolor**, **memorylistboardelementsbyempty**, **memorylistboardelementsbyidnameorpts**, **memorylistboardelementsbykind**, **memorylistboardnamedelements**, **memorylistboardptsbyempty**
- **memorypickboardfarthestpt**, **memorypickboardnearestpt**, **memoryreadboardpath(board, forcollision, frompt, topt, flee)**

## permissions.ts

Player roles, command allowlists, token bans.

- **PERMISSION_CONTROLLED_GROUPS**, **PERMISSION_CONTROLLED_COMMANDS**, **DEFAULT_ALLOWLIST_ADMIN**, **CREATIVE_ALLOWLIST_MOD**, **DEFAULT_ALLOWLIST_PLAYER**, **DEFAULT_ALLOWLIST_BY_ROLE**, **PERMISSION_ROLES**, **PERMISSION_CONFIG_NAMES**, **PERMISSION_PRESETS**, **PERMISSION_ALLOWLIST_BREAKDOWN** (type), **PERMISSION_CONFIG_NAME** (type)
- **ispermissioncontrolledcommand(command)**, **memorymapcommandtofamily(command)**, **memorycanruncommand(player, command)**
- **memorysetplayertotoken(player, token)**, **memorysetcommandpermissions(...)**
- **memoryistokenbanned(token)**, **memorybantoken(token)**, **memoryunbantoken(token)**, **memoryreadbannedtokens()**
- **memoryreadplayertotoken()**, **memoryreadallowlistbyrole()**, **memoryreadallowlistbreakdownbyrole()**, **memoryreadrolebytoken()**
- **memoryallowcommand(role, command)**, **memoryrevokecommand(role, command)**, **memorysetrolefortoken(token, role)**
- **memoryreadpermissionconfig()**, **memoryapplypermissionconfig(name)**, **memoryserializepermissions()**

## utilities.ts

- **CONFIG_KEYS**, **memorysetconfig(list)**, **memoryreadconfig(name)**, **memoryreadconfigall()**, **memorywriteconfig(name, value)**
- **memoryadminmenu(player)** - Admin scroll
- **memorycompressbooks(books)** (async), **memorydecompressbooks(base64bytes)** (async)

## bookmarkscroll.ts / editorbookmarkscroll.ts

- **memorybookmarkscroll(player, includecodepages)** - Bookmarks scroll
- **memoryeditorbookmarkshorttitle(...)**, **memoryeditorbookmarkscroll(...)** - Editor bookmarks scroll

## inspection.ts

Top-level inspector entry points.

- **memoryinspect(player, p1, p2)** (async), **memoryinspectarea(player, p1, p2, hassecretheap)**
- **memoryinspectboardlines(board)**, **memoryinspectloaderlines(p1, p2)**
- **memoryinspectelement(player, board, codepage, element, p1, isobject)**
- **memoryinspectempty(player, p1, p2, mode)**, **memoryinspectemptymenu(player, p1, p2)**
- **memoryinspectchar / chararea**, **memoryinspectcolor / colorarea**, **memoryinspectbgarea**
- **memoryinspectcommand(path, player)**

## inspectionbatch.ts

- **memoryhassecretheap()** (async), **memoryreadsecretheap()** (async)
- **memoryinspectbatchcommand(path, player)** (async)
- **memoryinspectcopy / copymenu**, **memoryinspectcut / cutmenu**, **memoryinspectpaste / pastemenu**

## inspectionfind.ts

- **FINDANY_CONFIG** (type)
- **memoryfindany(path, player)** (async), **memoryfindanymenu(player)** (async)
- **memoryreadfindanyconfig()** (async), **memorywritefindanyconfig(updater)** (async)

## inspectionmakeit.ts

- **memorymakeitcommand(path, data, player)**, **memorymakeitscroll(makeit, player)**

## inspectionremix.ts

- **memoryinspectremixcommand(path, player)** (async), **memoryinspectremixmenu(player, p1, p2)** (async)
- **memoryreadremixconfig()** (async), **memorywriteremixconfig(updater)** (async)

## inspectionstyle.ts

- **memoryinspectstyle(player, p1, p2, mode)** (async), **memoryinspectstylemenu(player, p1, p2)** (async)
- **memoryreadstyleconfig()** (async), **memorywritestyleconfig(updater)** (async)

## types.ts

Constants and shared types: `BOARD_WIDTH`, `BOARD_HEIGHT`, `BOARD_SIZE`, `CHAR_RAY_MARGIN`, `FIXED_DATE`, `CORNER_EXIT_DISPUTED`, `MEMORY_LABEL`, `BOARD`, `BOARD_ELEMENT`, `BOARD_ELEMENT_STAT`, `BOOK`, `BOOK_FLAGS`, `CODE_PAGE`, `CODE_PAGE_RUNTIME`, `CODE_PAGE_STATS`, `CODE_PAGE_TYPE`, `CODE_PAGE_TYPE_MAP`, `MAYBE_CODE_PAGE`, `BOARD_RUNTIME`, `BOARD_ELEMENT_RUNTIME`.
