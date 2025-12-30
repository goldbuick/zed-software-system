# Memory Module - Exported Functions Summary

## boardelement.ts

- **memoryboardelementapplycolor(element, strcolor)** - Applies color string to element
- **memoryboardelementexport(boardelement)** - Exports element to serializable format
- **memoryboardelementimport(boardelemententry)** - Imports element from serialized format
- **memoryboardelementisobject(element)** - Checks if element is an object (not terrain)
- **memorycreateboardelement()** - Creates a new board element

## boardlookup.ts

- **memoryboardnamedwrite(board, element, index?)** - Adds element to named lookup
- **memoryboardobjectlookupwrite(board, object)** - Updates object in position lookup
- **memoryboardobjectnamedlookupdelete(board, object)** - Removes object from lookups
- **memoryboardresetlookups(board)** - Resets and rebuilds lookup tables
- **memoryboardsetlookup(board)** - Builds lookup tables for a board
- **memoryboardterrainnameddelete(board, terrain)** - Removes terrain from named lookup

## boardmovement.ts

- **memoryboardcheckblockedobject(board, collision, dest, isplayer?)** - Checks if a destination is blocked
- **memoryboardcheckmoveobject(board, target, dest)** - Checks if an object can move to destination
- **memoryboardcleanup(board, timestamp)** - Cleans up deleted elements from a board
- **memoryboardmoveobject(board, element, dest)** - Low-level object movement on a board
- **BOOK_RUN_ARGS** (type) - Arguments for board tick execution
- **memorymoveobject(book, board, element, dest, didpush?)** - Moves an object with collision, pushing, and interaction handling

## boardoperations.ts

- **memoryboarddeleteobject(board, id)** - Deletes an object from a board
- **memoryboardelementindex(board, pt)** - Converts point to board index
- **memoryboardelementread(board, pt)** - Reads element at a point (object or terrain)
- **memoryboardelementreadbyidorindex(board, idorindex)** - Reads element by ID or index
- **memoryboardevaldir(board, element, player, dir, startpt)** - Evaluates direction commands into destination points
- **memoryboardexport(board)** - Exports a board to a serializable format
- **memoryboardfindplayer(board, target, player)** - Finds a player element for targeting
- **memoryboardgetterrain(board, x, y)** - Gets terrain at coordinates
- **memoryboardimport(boardentry)** - Imports a board from serialized format
- **memoryboardobjectcreate(board, from)** - Creates a new object on a board
- **memoryboardobjectcreatefromkind(board, pt, kind, id?)** - Creates object from kind string
- **memoryboardobjectread(board, id)** - Gets an object by ID
- **memoryboardobjectreadbypt(board, pt)** - Gets object at a point
- **memoryboardobjectsread(board)** - Gets all objects on a board
- **memoryboardreadgroup(board, self, targetgroup)** - Reads elements matching a group specification
- **memoryboardsafedelete(board, element, timestamp)** - Safely deletes an element (marks for cleanup)
- **memoryboardsetterrain(board, from)** - Sets terrain at a position
- **memoryboardterrainsetfromkind(board, pt, kind)** - Sets terrain from a kind string
- **memoryboardtick(board, timestamp)** - Prepares code execution list for a board
- **memoryboardvisualsupdate(board)** - Updates board visual caches (over/under/charset/palette)
- **memorycreateboard(fn?)** - Creates a new empty board
- **memoryplayerblockedbyedge(board, element, dest)** - Checks if player movement is blocked by board edge
- **memoryplayerwaszapped(board, element, dest)** - Checks if player was zapped (hit edge or solid)
- **memoryptwithinboard(pt)** - Checks if a point is within board bounds

## bookoperations.ts

- **memorybookboardelementreadcodepage(book, element)** - Gets code page for a board element
- **memorybookclearcodepage(book, address)** - Removes a code page from a book
- **memorybookclearflags(book, id)** - Clears flags for an ID
- **memorybookelementdisplayread(element, defaultchar?, defaultcolor?, defaultbg?)** - Gets display properties for an element
- **memorybookensurecodepagewithtype(book, type, address)** - Ensures code page exists, creates if missing
- **memorybookexport(book)** - Exports book to serializable format
- **memorybookhasflags(book, id)** - Checks if flags exist for an ID
- **memorybookhasmatch(book, ids)** - Checks if book matches any ID
- **memorybookimport(bookentry)** - Imports book from serialized format
- **memorybookreadboard(book, address)** - Reads a board from a book
- **memorybookreadcodepagebyaddress(book, address)** - Finds code page by ID or name
- **memorybookreadcodepagedatabytype(book, type)** - Gets typed data for all code pages of a type
- **memorybookreadcodepagesbytype(book, type)** - Gets all code pages of a type
- **memorybookreadcodepagesbytypeandstat(book, type, statname)** - Gets code pages by type and stat
- **memorybookreadcodepagewithtype(book, type, address)** - Finds code page by type and address
- **memorybookreadcodepagesbystat(book, statname)** - Finds code pages matching a stat
- **memorybookreadflag(book, id, name)** - Reads a specific flag value
- **memorybookreadflags(book, id)** - Reads flags for an ID
- **memorybookreadsortedcodepages(book)** - Gets code pages sorted by type and name
- **memorybookupdatename(book)** - Updates book name
- **memorybookupdatetoken(book)** - Updates book token
- **memorybookwritecodepage(book, codepage)** - Adds a code page to a book
- **memorybookwriteflag(book, id, name, value)** - Writes a flag value
- **memorycreatebook(pages)** - Creates a new book

## cliruntime.ts

- **memorycli(player, cli, tracking?)** - Executes CLI command for a player
- **memoryclirepeatlast(player)** - Repeats last CLI command
- **memorycleanup()** - Performs garbage collection
- **memoryresetchipafteredit(object)** - Halts a chip after editing
- **memoryrestartallchipsandflags()** - Halts all chips and clears flags
- **memoryrun(address)** - Runs a code page once
- **memoryscrollunlock(id, player)** - Unlocks scroll for a player
- **memorystartloader(id, code)** - Starts a loader with code

## codepageoperations.ts

- **memorybitmapexport(bitmap)** - Exports bitmap to serializable format
- **memorybitmapimport(bitmapentry)** - Imports bitmap from serialized format
- **memorycodepageapplyelementstats(stats, element)** - Applies code page stats to a board element
- **memorycodepageexport(codepage)** - Exports codepage to serializable format
- **memorycodepagehasmatch(codepage, type, ids)** - Checks if codepage matches type and IDs
- **memorycodepageimport(codepageentry)** - Imports codepage from serialized format
- **memorycodepagereaddata(codepage)** - Gets typed data from code page (board/object/terrain/etc)
- **memorycodepagereadname(codepage)** - Gets the name of a code page
- **memorycodepagereadstat(codepage, stat)** - Reads a specific stat from code page
- **memorycodepagereadstatdefaults(codepage)** - Reads stats excluding type/name
- **memorycodepagereadstats(codepage)** - Reads all stats from code page (cached)
- **memorycodepagereadstatsfromtext(content)** - Parses stats from code text
- **memorycodepagereadtype(codepage)** - Gets the type of a code page
- **memorycodepagereadtypetostring(codepage)** - Gets type as string
- **memorycodepageresetstats(codepage)** - Resets cached stats
- **memorycodepagetypetostring(type)** - Converts code page type enum to string
- **memorycreatecodepage(code, content)** - Creates a new code page

## gameloop.ts

- **memorymessage(message)** - Sends a message to the OS message system
- **memorysendtoboards(target, message, data, boards)** - Sends messages to elements across multiple boards
- **memorysendtoelement(fromelement, toelement, label)** - Sends a message between elements
- **memorysendtoelements(chip, fromelement, send)** - Sends messages to multiple elements based on target spec
- **memorysendtolog(board, element, text)** - Sends a formatted log message
- **memorytick(playeronly?)** - Main game tick function, updates all boards and runs code
- **memorytickobject(book, board, object, code)** - Ticks a single object's code

## index.ts

- **MEMORY_LABEL** (enum) - Labels for memory slots (MAIN, TEMP, TITLE, PLAYER, GADGETSTORE)
- **memoryboardinit(board)** - Initializes a board (loads kinds, builds lookups)
- **memoryboardread(address)** - Reads a board codepage by address
- **memoryclearbook(address)** - Removes a book from memory
- **memoryclearflags(id)** - Clears flags for an ID
- **memorycreatesoftwarebook(maybename?)** - Creates a new software book
- **memoryelementcheckpushable(pusher, target)** - Checks if target can be pushed by pusher
- **memoryelementkindread(element)** - Reads and caches the kind data for an element
- **memoryelementstatread(element, stat)** - Reads a stat value from element, kind, or codepage with defaults
- **memoryensurebookbyname(name)** - Ensures a book exists by name, creates if missing
- **memoryensuresoftwarebook(slot, maybename?)** - Ensures a software book exists for a slot
- **memoryensuresoftwarecodepage(slot, address, createtype)** - Ensures a codepage exists in a software book
- **memorygetloaders()** - Returns the loaders map (internal)
- **memoryhasflags(id)** - Checks if flags exist for an ID
- **memoryisoperator(player)** - Checks if a player is the current operator
- **memorylistcodepagewithtype(type)** - Lists all codepages of a specific type across all books
- **memoryoverboardread(board)** - Reads the over board for a board
- **memorypickcodepagewithtype(type, address)** - Finds a codepage by type and address across all books
- **memoryreadbookbyaddress(address)** - Finds a book by ID or name
- **memoryreadbookbysoftware(slot)** - Gets the book for a software slot
- **memoryreadbooklist()** - Returns all books in memory
- **memoryreadfirstbook()** - Returns the first book
- **memoryreadfirstcontentbook()** - Returns the first content book (excluding main)
- **memoryreadflags(id)** - Reads flags for an ID
- **memoryreadhalt()** - Returns the halt state
- **memoryreadoperator()** - Returns the current operator/player ID
- **memoryreadsession()** - Returns the current session ID
- **memoryreadtopic()** - Returns the current multiplayer topic
- **memoryresetbooks(books)** - Resets all books with new array
- **memorysetbook(book)** - Adds/updates a book in memory
- **memorysetsoftwarebook(slot, book)** - Sets a book for a software slot (main/temp)
- **memoryunderboardread(board)** - Reads the under board for a board
- **memorywritebullet(board, kind, dest)** - Creates a bullet object from a kind string
- **memorywritefromkind(board, kind, dest, id?)** - Creates an object or terrain from a kind string
- **memorywritehalt(halt)** - Sets the halt state
- **memorywriteoperator(operator)** - Sets the current operator
- **memorywritetopic(topic)** - Sets the multiplayer topic

## inspection.ts

- **memorygadgetinspectboard(player, board)** - Shows board information in gadget
- **memorygadgetinspectloaders(player, p1, p2)** - Shows gadget action loaders
- **memoryinspect(player, p1, p2)** - Main inspection function for elements or areas
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

- **memoryhassecretheap()** - Checks if clipboard has data
- **memoryinspectbatchcommand(path, player)** - Handles batch operation commands
- **memoryinspectcopy(player, p1, p2, mode)** - Copies elements to clipboard
- **memoryinspectcopymenu(player, p1, p2)** - Shows copy operation menu
- **memoryinspectcut(player, p1, p2, mode)** - Cuts elements to clipboard
- **memoryinspectcutmenu(player, p1, p2)** - Shows cut operation menu
- **memoryinspectpaste(player, p1, p2, mode)** - Pastes elements from clipboard
- **memoryinspectpastemenu(player, p1, p2)** - Shows paste operation menu
- **memoryreadsecretheap()** - Reads clipboard buffer

## inspectionfind.ts

- **FINDANY_CONFIG** (type) - Configuration for find operations
- **memoryfindany(path, player)** - Executes find operation
- **memoryfindanymenu(player)** - Shows find menu with configurable search slots
- **memoryreadfindanyconfig()** - Reads find configuration
- **memorywritefindanyconfig(updater)** - Writes find configuration

## inspectionmakeit.ts

- **memorymakeitcommand(path, data, player)** - Handles code page creation commands
- **memorymakeitscroll(makeit, player)** - Shows code page creation scroll

## inspectionremix.ts

- **memoryinspectremixcommand(path, player)** - Handles remix commands
- **memoryinspectremixmenu(player, p1, p2)** - Shows remix operation menu
- **memoryreadremixconfig()** - Reads remix configuration
- **memorywriteremixconfig(updater)** - Writes remix configuration

## inspectionstyle.ts

- **memoryinspectstyle(player, p1, p2, mode)** - Applies style from clipboard to area
- **memoryinspectstylemenu(player, p1, p2)** - Shows style operation menu
- **memoryreadstyleconfig()** - Reads style configuration
- **memorywritestyleconfig(updater)** - Writes style configuration

## loader.ts

- **memoryloader(arg, format, idoreventname, content, player)** - Runs matching loaders
- **memoryloaderarg(id)** - Gets loader argument
- **memoryloadercontent(id)** - Gets loader content
- **memoryloaderdone(id)** - Marks loader as done
- **memoryloaderformat(id)** - Gets loader format
- **memoryloadermatches(format, idoreventname)** - Finds loaders matching format/event
- **memoryloaderplayer(id)** - Gets loader player

## playermanagement.ts

- **memorybookplayermovetoboard(book, player, board, dest)** - Moves player to a different board
- **memorybookplayerreadactive(book, player)** - Checks if player is in active list
- **memorybookplayerreadboards(book)** - Gets all boards with active players
- **memorybookplayersetboard(book, player, board)** - Sets player's current board
- **memoryplayerlogin(player, stickyflags)** - Logs in a player, places them on a board
- **memoryplayerlogout(player, isendgame)** - Logs out a player, cleans up their state
- **memoryplayerscan(players)** - Scans and tracks all player IDs across boards
- **memoryreadplayeractive(player)** - Checks if a player is active and on a board
- **memoryreadplayerboard(player)** - Gets the board a player is currently on

## rendering.ts

- **memorycreatecachedsprite(player, index, id, spriteindex)** - Creates a cached sprite for rendering
- **MEMORY_GADGET_LAYERS** (type) - Type for gadget layer data
- **memorycodepagetoprefix(codepage)** - Gets display prefix for a code page
- **memoryconverttogadgetcontrollayer(player, index, board)** - Creates control layer for gadget rendering
- **memoryconverttogadgetlayers(player, index, board, tickers, whichlayer, multi?)** - Converts board to gadget render layers
- **memoryelementtodisplayprefix(element)** - Gets display prefix for an element
- **memoryelementtologprefix(element)** - Gets log prefix for an element
- **memoryreadgadgetlayers(player, board)** - Reads complete gadget layer data for a board

## spatialqueries.ts

- **memoryboardcheckcollide(source, dest)** - Checks if two collision types collide
- **memoryboardfindplayerforelement(board, elementpt, player)** - Finds player element for targeting
- **memoryboardlistelementsbycolor(board, strcolor)** - Lists elements matching a color
- **memoryboardlistelementsbyempty(board)** - Lists points with empty elements
- **memoryboardlistelementsbyidnameorpts(board, idnameorpts)** - Lists elements by ID, name, or points
- **memoryboardlistelementsbykind(board, kind)** - Lists elements matching a kind string
- **memoryboardlistnamedelements(board, name)** - Lists elements with a specific name
- **memoryboardlistptsbyempty(board)** - Lists empty points
- **memoryboardpickfarthestpt(pt, items)** - Picks farthest element from a point
- **memoryboardpicknearestpt(pt, items)** - Picks nearest element to a point
- **memoryboardreadpath(board, forcollision, frompt, topt, flee)** - Calculates path between two points using distance maps

## types.ts

- **BOARD** (type) - Type for board data structure
- **BOARD_ELEMENT** (type) - Type for board elements (objects and terrain)
- **BOARD_ELEMENT_STAT** (type) - Type for board element stat keys
- **BOARD_HEIGHT** (const) - Board height constant (25)
- **BOARD_SIZE** (const) - Total board size constant (BOARD_WIDTH \* BOARD_HEIGHT)
- **BOARD_WIDTH** (const) - Board width constant (60)
- **BOOK** (type) - Type for book data structure
- **BOOK_FLAGS** (type) - Type for book flags
- **CODE_PAGE** (type) - Type for code page data structure
- **CODE_PAGE_STATS** (type) - Type for code page stats
- **CODE_PAGE_TYPE** (enum) - Enum for code page types
- **CODE_PAGE_TYPE_MAP** (type) - Type mapping for code page types
- **MAYBE_CODE_PAGE** (type) - Optional code page type

## utilities.ts

- **memorycompressbooks(books)** - Compresses books to base64 URL string
- **memorydecompressbooks(base64bytes)** - Decompresses books from base64 URL string
- **memoryadminmenu(player)** - Shows admin menu with player list and utilities
