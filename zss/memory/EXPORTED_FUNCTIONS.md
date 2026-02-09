# Memory Module - Exported Functions Summary

## boardelement.ts

- **memoryapplyboardelementcolor(element, strcolor)** - Applies color string to element
- **memoryboardelementisobject(element)** - Checks if element is an object (not terrain)
- **memorycreateboardelement()** - Creates a new board element
- **memoryexportboardelement(boardelement)** - Exports element to serializable format
- **memoryimportboardelement(boardelemententry)** - Imports element from serialized format

## boardlookup.ts

- **memorydeleteboardobjectnamedlookup(board, object)** - Removes object from lookups
- **memorydeleteboardterrainnamed(board, terrain)** - Removes terrain from named lookup
- **memoryinitboardlookup(board)** - Builds lookup tables for a board
- **memoryresetboardlookups(board)** - Resets and rebuilds lookup tables
- **memorywriteboardnamed(board, element, index?)** - Adds element to named lookup
- **memorywriteboardobjectlookup(board, object)** - Updates object in position lookup

## boardmovement.ts

- **memorycheckblockedboardobject(board, collision, dest, isplayer?)** - Checks if a destination is blocked
- **memorycheckmoveboardobject(board, target, dest)** - Checks if an object can move to destination
- **memorycleanupboard(board, timestamp)** - Cleans up deleted elements from a board
- **memorymoveboardobject(board, element, dest)** - Low-level object movement on a board
- **memorymoveobject(book, board, element, dest, didpush?)** - Moves an object with collision, pushing, and interaction handling

## boardoperations.ts

- **memoryboardelementindex(board, pt)** - Converts point to board index
- **memorycreateboard(fn?)** - Creates a new empty board
- **memorycreateboardobject(board, from)** - Creates a new object on a board
- **memorycreateboardobjectfromkind(board, pt, kind, id?)** - Creates object from kind string
- **memorydeleteboardobject(board, id)** - Deletes an object from a board
- **memoryevaldir(board, element, player, dir, startpt)** - Evaluates direction commands into destination points
- **memoryexportboard(board)** - Exports a board to a serializable format
- **memoryfindboardplayer(board, target, player)** - Finds a player element for targeting
- **memoryimportboard(boardentry)** - Imports a board from serialized format
- **memoryplayerblockedbyedge(book, board, element, dest)** - Checks if player movement is blocked by board edge
- **memoryplayerwaszapped(book, board, element, id)** - Checks if player was zapped (hit edge or solid)
- **memoryptwithinboard(pt)** - Checks if a point is within board bounds
- **memoryreadelement(board, pt)** - Reads element at a point (object or terrain)
- **memoryreadelementbyidorindex(board, idorindex)** - Reads element by ID or index
- **memoryreadgroup(board, self, targetgroup)** - Reads elements matching a group specification
- **memoryreadobject(board, id)** - Gets an object by ID
- **memoryreadobjectbypt(board, pt)** - Gets object at a point
- **memoryreadobjects(board)** - Gets all objects on a board
- **memoryreadterrain(board, x, y)** - Gets terrain at coordinates
- **memorysafedeleteelement(board, element, timestamp)** - Safely deletes an element (marks for cleanup)
- **memorytickboard(board, timestamp)** - Prepares code execution list for a board
- **memoryupdateboardvisuals(board)** - Updates board visual caches (over/under/charset/palette)
- **memorywriteterrain(board, from)** - Sets terrain at a position
- **memorywriteterrainfromkind(board, pt, kind)** - Sets terrain from a kind string

## bookoperations.ts

- **memoryclearbookcodepage(book, address)** - Removes a code page from a book
- **memoryclearbookflags(book, id)** - Clears flags for an ID
- **memorycreatebook(pages)** - Creates a new book
- **memoryensurebookcodepagewithtype(book, type, address)** - Ensures code page exists, creates if missing
- **memoryexportbook(book)** - Exports book to serializable format
- **memoryhasbookflags(book, id)** - Checks if flags exist for an ID
- **memoryhasbookmatch(book, ids)** - Checks if book matches any ID
- **memoryimportbook(bookentry)** - Imports book from serialized format
- **memorylistcodepagebystat(book, statname)** - Finds code pages matching a stat
- **memorylistcodepagedatabytype(book, type)** - Gets typed data for all code pages of a type
- **memorylistcodepagebytype(book, type)** - Gets all code pages of a type
- **memorylistcodepagebytypeandstat(book, type, statname)** - Gets code pages by type and stat
- **memorylistcodepagessorted(book)** - Gets code pages sorted by type and name
- **memoryreadcodepage(book, address)** - Finds code page by ID or name
- **memoryreadcodepagewithtype(book, type, address)** - Finds code page by type and address
- **memoryreadelementcodepage(book, element)** - Gets code page for a board element
- **memoryreadelementdisplay(element, defaultchar?, defaultcolor?, defaultbg?)** - Gets display properties for an element
- **memoryreadbookflag(book, id, name)** - Reads a specific flag value
- **memoryreadbookflags(book, id)** - Reads flags for an ID
- **memoryupdatebookname(book)** - Updates book name
- **memoryupdatebooktoken(book)** - Updates book token
- **memorywritecodepage(book, codepage)** - Adds a code page to a book
- **memorywritebookflag(book, id, name, value)** - Writes a flag value

## runtime.ts

- **memorygc()** - Performs garbage collection
- **memoryhaltchip(id)** - Halts a chip by ID
- **memorymessagechip(message)** - Sends a message to the OS message/chip system
- **memoryrepeatclilast(player)** - Repeats last CLI command
- **memoryrestartallchipsandflags()** - Halts all chips and clears flags
- **memoryruncli(player, cli, tracking?)** - Executes CLI command for a player
- **memoryruncodepage(address)** - Runs a code page once
- **memorytickmain(playeronly?)** - Main game tick function, updates all boards and runs code
- **memorytickobject(book, board, object, code)** - Ticks a single object's code
- **memoryunlockscroll(id, player)** - Unlocks scroll for a player

## gamesend.ts

- **memorysendtoboards(target, message, data, boards)** - Sends messages to elements across multiple boards
- **memorysendtoelement(fromelement, toelement, label)** - Sends a message between elements
- **memorysendtoelements(chip, fromelement, send)** - Sends messages to multiple elements based on target spec
- **memorysendtolog(board, element, text)** - Sends a formatted log message

## codepageoperations.ts

- **memoryapplyelementstats(stats, element)** - Applies code page stats to a board element
- **memorycodepagehasmatch(codepage, type, ids)** - Checks if codepage matches type and IDs
- **memorycodepagetypetostring(type)** - Converts code page type enum to string
- **memorycreatecodepage(code, content)** - Creates a new code page
- **memoryexportbitmap(bitmap)** - Exports bitmap to serializable format
- **memoryexportcodepage(codepage)** - Exports codepage to serializable format
- **memoryimportbitmap(bitmapentry)** - Imports bitmap from serialized format
- **memoryimportcodepage(codepageentry)** - Imports codepage from serialized format
- **memoryreadcodepagedata(codepage)** - Gets typed data from code page (board/object/terrain/etc)
- **memoryreadcodepagename(codepage)** - Gets the name of a code page
- **memoryreadcodepagestat(codepage, stat)** - Reads a specific stat from code page
- **memoryreadcodepagestatdefaults(codepage)** - Reads stats excluding type/name
- **memoryreadcodepagestats(codepage)** - Reads all stats from code page (cached)
- **memoryreadcodepagestatsfromtext(content)** - Parses stats from code text
- **memoryreadcodepagetype(codepage)** - Gets the type of a code page
- **memoryreadcodepagetypeasstring(codepage)** - Gets type as string
- **memoryresetcodepagestats(codepage)** - Resets cached stats

## index.ts

- **memorycheckelementpushable(pusher, target)** - Checks if target can be pushed by pusher
- **memoryclearbook(address)** - Removes a book from memory
- **memoryclearflags(id)** - Clears flags for an ID
- **memorycreatesoftwarebook(maybename?)** - Creates a new software book
- **memorystartloader(id, code)** - Starts a loader with code
- **memoryensurebookbyname(name)** - Ensures a book exists by name, creates if missing
- **memoryensuresoftwarebook(slot, maybename?)** - Ensures a software book exists for a slot
- **memoryensuresoftwarecodepage(slot, address, createtype)** - Ensures a codepage exists in a software book
- **memoryhasflags(id)** - Checks if flags exist for an ID
- **memoryinitboard(board)** - Initializes a board (loads kinds, builds lookups)
- **memoryisoperator(player)** - Checks if a player is the current operator
- **memorylistcodepagewithtype(type)** - Lists all codepages of a specific type across all books
- **memorypickcodepagewithtype(type, address)** - Finds a codepage by type and address across all books
- **memoryreadboardbyaddress(address)** - Reads a board codepage by address
- **memoryreadbookbyaddress(address)** - Finds a book by ID or name
- **memoryreadbookbysoftware(slot)** - Gets the book for a software slot
- **memoryreadbooklist()** - Returns all books in memory
- **memoryreadelementkind(element)** - Reads and caches the kind data for an element
- **memoryreadelementstat(element, stat)** - Reads a stat value from element, kind, or codepage with defaults
- **memoryreadfirstbook()** - Returns the first book
- **memoryreadfirstcontentbook()** - Returns the first content book (excluding main)
- **memoryreadflags(id)** - Reads flags for an ID
- **memoryreadhalt()** - Returns the halt state
- **memoryreadloaders()** - Returns the loaders map (internal)
- **memoryreadoperator()** - Returns the current operator/player ID
- **memoryreadsession()** - Returns the session ID
- **memoryreadoverboard(board)** - Reads the over board for a board
- **memoryreadtopic()** - Returns the current multiplayer topic
- **memoryreadunderboard(board)** - Reads the under board for a board
- **memoryresetbooks(books)** - Resets all books with new array
- **memorywritebook(book)** - Adds/updates a book in memory
- **memorywritebullet(board, kind, dest)** - Creates a bullet object from a kind string
- **memorywriteelementfromkind(board, kind, dest, id?)** - Creates an object or terrain from a kind string
- **memorywritehalt(halt)** - Sets the halt state
- **memorywriteoperator(operator)** - Sets the current operator
- **memorywritesoftwarebook(slot, book)** - Sets a book for a software slot (main/temp)
- **memorywritetopic(topic)** - Sets the multiplayer topic

## inspection.ts

- **memorygadgetinspectboard(player, board)** - Shows board information in gadget
- **memorygadgetinspectloaders(player, p1, p2)** - Shows gadget action loaders
- **memoryinspect(player, p1, p2)** - Main inspection function for elements or areas (async)
- **memoryinspectarea(player, p1, p2, hassecretheap)** - Inspects a rectangular area
- **memoryinspectbgarea(player, p1, p2, name)** - Batch edits backgrounds in an area
- **memoryinspectchar(player, element, name)** - Inspects/edits element character
- **memoryinspectchararea(player, p1, p2, name)** - Batch edits characters in an area
- **memoryinspectcolor(player, element, name)** - Inspects/edits element color
- **memoryinspectcolorarea(player, p1, p2, name)** - Batch edits colors in an area
- **memoryinspectcommand(path, player)** - Handles inspection command actions
- **memoryinspectelement(player, board, codepage, element, p1, isobject)** - Inspects a single element
- **memoryinspectempty(player, p1, p2, mode)** - Empties elements in an area
- **memoryinspectemptymenu(player, p1, p2)** - Shows empty operation menu

## inspectionbatch.ts

- **memoryhassecretheap()** - Checks if clipboard has data (async)
- **memoryinspectbatchcommand(path, player)** - Handles batch operation commands (async)
- **memoryinspectcopy(player, p1, p2, mode)** - Copies elements to clipboard (async)
- **memoryinspectcopymenu(player, p1, p2)** - Shows copy operation menu
- **memoryinspectcut(player, p1, p2, mode)** - Cuts elements to clipboard (async)
- **memoryinspectcutmenu(player, p1, p2)** - Shows cut operation menu
- **memoryinspectpaste(player, p1, p2, mode)** - Pastes elements from clipboard (async)
- **memoryinspectpastemenu(player, p1, p2)** - Shows paste operation menu
- **memoryreadsecretheap()** - Reads clipboard buffer (async)

## inspectionfind.ts

- **FINDANY_CONFIG** (type) - Find configuration with expr1–expr4 slots
- **memoryfindany(path, player)** - Executes find operation (async)
- **memoryfindanymenu(player)** - Shows find menu with configurable search slots (async)
- **memoryreadfindanyconfig()** - Reads find configuration (async)
- **memorywritefindanyconfig(updater)** - Writes find configuration (async)

## inspectionmakeit.ts

- **memorymakeitcommand(path, data, player)** - Handles code page creation commands
- **memorymakeitscroll(makeit, player)** - Shows code page creation scroll

## inspectionremix.ts

- **memoryinspectremixcommand(path, player)** - Handles remix commands (async)
- **memoryinspectremixmenu(player, p1, p2)** - Shows remix operation menu (async)
- **memoryreadremixconfig()** - Reads remix configuration (async)
- **memorywriteremixconfig(updater)** - Writes remix configuration (async)

## inspectionstyle.ts

- **memoryinspectstyle(player, p1, p2, mode)** - Applies style from clipboard to area (async)
- **memoryinspectstylemenu(player, p1, p2)** - Shows style operation menu (async)
- **memoryreadstyleconfig()** - Reads style configuration (async)
- **memorywritestyleconfig(updater)** - Writes style configuration (async)

## loader.ts

- **memoryloader(arg, format, idoreventname, content, player)** - Runs matching loaders
- **memoryloaderarg(id)** - Gets loader argument
- **memoryloadercontent(id)** - Gets loader content
- **memoryloaderdone(id)** - Marks loader as done
- **memoryloaderformat(id)** - Gets loader format
- **memoryloadermatches(format, idoreventname)** - Finds loaders matching format/event
- **memoryloaderplayer(id)** - Gets loader player

## playermanagement.ts

- **memoryloginplayer(player, stickyflags)** - Logs in a player, places them on a board
- **memorylogoutplayer(player, isendgame)** - Logs out a player, cleans up their state
- **memorymoveplayertoboard(book, player, board, dest)** - Moves player to a different board
- **memoryreadbookplayeractive(book, player)** - Checks if player is in active list
- **memoryreadbookplayerboards(book)** - Gets all boards with active players
- **memoryreadplayeractive(player)** - Checks if a player is active and on a board
- **memoryreadplayerboard(player)** - Gets the board a player is currently on
- **memoryscanplayers(players)** - Scans and tracks all player IDs across boards
- **memorywritebookplayerboard(book, player, board)** - Sets player's current board

## rendering.ts

- **memorycodepagetoprefix(codepage)** - Gets display prefix for a code page
- **memoryconverttogadgetcontrollayer(player, index, board)** - Creates control layer for gadget rendering
- **memoryconverttogadgetlayers(player, index, board, tickers, whichlayer, multi?)** - Converts board to gadget render layers
- **memorycreatecachedsprite(player, index, id, spriteindex)** - Creates a cached sprite for rendering
- **memoryelementtodisplayprefix(element)** - Gets display prefix for an element
- **memoryelementtologprefix(element)** - Gets log prefix for an element
- **memoryreadgadgetlayers(player, board)** - Reads complete gadget layer data for a board

## spatialqueries.ts

- **memorycheckcollision(source, dest)** - Checks if two collision types collide
- **memoryfindplayerforelement(board, elementpt, player)** - Finds player element for targeting
- **memorylistboardelementsbycolor(board, strcolor)** - Lists elements matching a color
- **memorylistboardelementsbyempty(board)** - Lists points with empty elements
- **memorylistboardelementsbyidnameorpts(board, idnameorpts)** - Lists elements by ID, name, or points
- **memorylistboardelementsbykind(board, kind)** - Lists elements matching a kind string
- **memorylistboardnamedelements(board, name)** - Lists elements with a specific name
- **memorylistboardptsbyempty(board)** - Lists empty points
- **memorypickboardfarthestpt(pt, items)** - Picks farthest element from a point
- **memorypickboardnearestpt(pt, items)** - Picks nearest element to a point
- **memoryreadboardpath(board, forcollision, frompt, topt, flee)** - Calculates path between two points using distance maps

## synthstate.ts

- **memoryreadsynthstate(book, id)** - Reads cached synth state from book flags for id (e.g. board id)
- **memorywritesynthstate(book, id, state)** - Writes synth state to book flags
- **memoryclearsynthstate(book, id)** - Clears cached synth state for id
- **memoryhassynthstate(book, id)** - Checks if synth state exists for id

## utilities.ts

- **memoryadminmenu(player)** - Shows admin menu with player list and utilities (async)
- **memorycompressbooks(books)** - Compresses books to base64 URL string (async)
- **memorydecompressbooks(base64bytes)** - Decompresses books from base64 URL string (async)
