# Memory Module - Exported Functions Summary

## boardelement.ts

- **boardelementapplycolor(element, strcolor)** - Applies color string to element
- **boardelementexport(boardelement)** - Exports element to serializable format
- **boardelementimport(boardelemententry)** - Imports element from serialized format
- **boardelementisobject(element)** - Checks if element is an object (not terrain)
- **createboardelement()** - Creates a new board element

## boardlookup.ts

- **boardnamedwrite(board, element, index?)** - Adds element to named lookup
- **boardobjectlookupwrite(board, object)** - Updates object in position lookup
- **boardobjectnamedlookupdelete(board, object)** - Removes object from lookups
- **boardresetlookups(board)** - Resets and rebuilds lookup tables
- **boardsetlookup(board)** - Builds lookup tables for a board
- **boardterrainnameddelete(board, terrain)** - Removes terrain from named lookup

## boardmovement.ts

- **boardcheckblockedobject(board, collision, dest, isplayer?)** - Checks if a destination is blocked
- **boardcheckmoveobject(board, target, dest)** - Checks if an object can move to destination
- **boardcleanup(board, timestamp)** - Cleans up deleted elements from a board
- **boardmoveobject(board, element, dest)** - Low-level object movement on a board
- **BOOK_RUN_ARGS** (type) - Arguments for board tick execution
- **memorymoveobject(book, board, element, dest, didpush?)** - Moves an object with collision, pushing, and interaction handling

## boardoperations.ts

- **boarddeleteobject(board, id)** - Deletes an object from a board
- **boardelementindex(board, pt)** - Converts point to board index
- **boardelementread(board, pt)** - Reads element at a point (object or terrain)
- **boardelementreadbyidorindex(board, idorindex)** - Reads element by ID or index
- **boardevaldir(board, element, player, dir, startpt)** - Evaluates direction commands into destination points
- **boardexport(board)** - Exports a board to a serializable format
- **boardfindplayer(board, target, player)** - Finds a player element for targeting
- **boardgetterrain(board, x, y)** - Gets terrain at coordinates
- **boardimport(boardentry)** - Imports a board from serialized format
- **boardobjectcreate(board, from)** - Creates a new object on a board
- **boardobjectcreatefromkind(board, pt, kind, id?)** - Creates object from kind string
- **boardobjectread(board, id)** - Gets an object by ID
- **boardobjectreadbypt(board, pt)** - Gets object at a point
- **boardobjectsread(board)** - Gets all objects on a board
- **boardreadgroup(board, self, targetgroup)** - Reads elements matching a group specification
- **boardsafedelete(board, element, timestamp)** - Safely deletes an element (marks for cleanup)
- **boardsetterrain(board, from)** - Sets terrain at a position
- **boardterrainsetfromkind(board, pt, kind)** - Sets terrain from a kind string
- **boardtick(board, timestamp)** - Prepares code execution list for a board
- **boardvisualsupdate(board)** - Updates board visual caches (over/under/charset/palette)
- **createboard(fn?)** - Creates a new empty board
- **playerblockedbyedge(board, element, dest)** - Checks if player movement is blocked by board edge
- **playerwaszapped(board, element, dest)** - Checks if player was zapped (hit edge or solid)
- **ptwithinboard(pt)** - Checks if a point is within board bounds

## bookoperations.ts

- **bookboardelementreadcodepage(book, element)** - Gets code page for a board element
- **bookclearcodepage(book, address)** - Removes a code page from a book
- **bookclearflags(book, id)** - Clears flags for an ID
- **bookelementdisplayread(element, defaultchar?, defaultcolor?, defaultbg?)** - Gets display properties for an element
- **bookensurecodepagewithtype(book, type, address)** - Ensures code page exists, creates if missing
- **bookexport(book)** - Exports book to serializable format
- **bookhasflags(book, id)** - Checks if flags exist for an ID
- **bookhasmatch(book, ids)** - Checks if book matches any ID
- **bookimport(bookentry)** - Imports book from serialized format
- **bookreadboard(book, address)** - Reads a board from a book
- **bookreadcodepagebyaddress(book, address)** - Finds code page by ID or name
- **bookreadcodepagedatabytype(book, type)** - Gets typed data for all code pages of a type
- **bookreadcodepagesbytype(book, type)** - Gets all code pages of a type
- **bookreadcodepagesbytypeandstat(book, type, statname)** - Gets code pages by type and stat
- **bookreadcodepagewithtype(book, type, address)** - Finds code page by type and address
- **bookreadcodepagesbystat(book, statname)** - Finds code pages matching a stat
- **bookreadflag(book, id, name)** - Reads a specific flag value
- **bookreadflags(book, id)** - Reads flags for an ID
- **bookreadsortedcodepages(book)** - Gets code pages sorted by type and name
- **bookupdatename(book)** - Updates book name
- **bookupdatetoken(book)** - Updates book token
- **bookwritecodepage(book, codepage)** - Adds a code page to a book
- **bookwriteflag(book, id, name, value)** - Writes a flag value
- **createbook(pages)** - Creates a new book

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

- **bitmapexport(bitmap)** - Exports bitmap to serializable format
- **bitmapimport(bitmapentry)** - Imports bitmap from serialized format
- **codepageapplyelementstats(stats, element)** - Applies code page stats to a board element
- **codepageexport(codepage)** - Exports codepage to serializable format
- **codepagehasmatch(codepage, type, ids)** - Checks if codepage matches type and IDs
- **codepageimport(codepageentry)** - Imports codepage from serialized format
- **codepagereaddata(codepage)** - Gets typed data from code page (board/object/terrain/etc)
- **codepagereadname(codepage)** - Gets the name of a code page
- **codepagereadstat(codepage, stat)** - Reads a specific stat from code page
- **codepagereadstatdefaults(codepage)** - Reads stats excluding type/name
- **codepagereadstats(codepage)** - Reads all stats from code page (cached)
- **codepagereadstatsfromtext(content)** - Parses stats from code text
- **codepagereadtype(codepage)** - Gets the type of a code page
- **codepagereadtypetostring(codepage)** - Gets type as string
- **codepageresetstats(codepage)** - Resets cached stats
- **codepagetypetostring(type)** - Converts code page type enum to string
- **createcodepage(code, content)** - Creates a new code page

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

- **gadgetinspectboard(player, board)** - Shows board information in gadget
- **gadgetinspectloaders(player, p1, p2)** - Shows gadget action loaders
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

- **hassecretheap()** - Checks if clipboard has data
- **memoryinspectbatchcommand(path, player)** - Handles batch operation commands
- **memoryinspectcopy(player, p1, p2, mode)** - Copies elements to clipboard
- **memoryinspectcopymenu(player, p1, p2)** - Shows copy operation menu
- **memoryinspectcut(player, p1, p2, mode)** - Cuts elements to clipboard
- **memoryinspectcutmenu(player, p1, p2)** - Shows cut operation menu
- **memoryinspectpaste(player, p1, p2, mode)** - Pastes elements from clipboard
- **memoryinspectpastemenu(player, p1, p2)** - Shows paste operation menu
- **readsecretheap()** - Reads clipboard buffer

## inspectionfind.ts

- **FINDANY_CONFIG** (type) - Configuration for find operations
- **memoryfindany(path, player)** - Executes find operation
- **memoryfindanymenu(player)** - Shows find menu with configurable search slots
- **readfindanyconfig()** - Reads find configuration
- **writefindanyconfig(updater)** - Writes find configuration

## inspectionmakeit.ts

- **memorymakeitcommand(path, data, player)** - Handles code page creation commands
- **memorymakeitscroll(makeit, player)** - Shows code page creation scroll

## inspectionremix.ts

- **memoryinspectremixcommand(path, player)** - Handles remix commands
- **memoryinspectremixmenu(player, p1, p2)** - Shows remix operation menu
- **readremixconfig()** - Reads remix configuration
- **writeremixconfig(updater)** - Writes remix configuration

## inspectionstyle.ts

- **memoryinspectstyle(player, p1, p2, mode)** - Applies style from clipboard to area
- **memoryinspectstylemenu(player, p1, p2)** - Shows style operation menu
- **readstyleconfig()** - Reads style configuration
- **writestyleconfig(updater)** - Writes style configuration

## loader.ts

- **memoryloader(arg, format, idoreventname, content, player)** - Runs matching loaders
- **memoryloaderarg(id)** - Gets loader argument
- **memoryloadercontent(id)** - Gets loader content
- **memoryloaderdone(id)** - Marks loader as done
- **memoryloaderformat(id)** - Gets loader format
- **memoryloadermatches(format, idoreventname)** - Finds loaders matching format/event
- **memoryloaderplayer(id)** - Gets loader player

## playermanagement.ts

- **bookplayermovetoboard(book, player, board, dest)** - Moves player to a different board
- **bookplayerreadactive(book, player)** - Checks if player is in active list
- **bookplayerreadboards(book)** - Gets all boards with active players
- **bookplayersetboard(book, player, board)** - Sets player's current board
- **memoryplayerlogin(player, stickyflags)** - Logs in a player, places them on a board
- **memoryplayerlogout(player, isendgame)** - Logs out a player, cleans up their state
- **memoryplayerscan(players)** - Scans and tracks all player IDs across boards
- **memoryreadplayeractive(player)** - Checks if a player is active and on a board
- **memoryreadplayerboard(player)** - Gets the board a player is currently on

## rendering.ts

- **createcachedsprite(player, index, id, spriteindex)** - Creates a cached sprite for rendering
- **MEMORY_GADGET_LAYERS** (type) - Type for gadget layer data
- **memorycodepagetoprefix(codepage)** - Gets display prefix for a code page
- **memoryconverttogadgetcontrollayer(player, index, board)** - Creates control layer for gadget rendering
- **memoryconverttogadgetlayers(player, index, board, tickers, whichlayer, multi?)** - Converts board to gadget render layers
- **memoryelementtodisplayprefix(element)** - Gets display prefix for an element
- **memoryelementtologprefix(element)** - Gets log prefix for an element
- **memoryreadgadgetlayers(player, board)** - Reads complete gadget layer data for a board

## spatialqueries.ts

- **boardcheckcollide(source, dest)** - Checks if two collision types collide
- **boardfindplayerforelement(board, elementpt, player)** - Finds player element for targeting
- **boardlistelementsbycolor(board, strcolor)** - Lists elements matching a color
- **boardlistelementsbyempty(board)** - Lists points with empty elements
- **boardlistelementsbyidnameorpts(board, idnameorpts)** - Lists elements by ID, name, or points
- **boardlistelementsbykind(board, kind)** - Lists elements matching a kind string
- **boardlistnamedelements(board, name)** - Lists elements with a specific name
- **boardlistptsbyempty(board)** - Lists empty points
- **boardpickfarthestpt(pt, items)** - Picks farthest element from a point
- **boardpicknearestpt(pt, items)** - Picks nearest element to a point
- **boardreadpath(board, forcollision, frompt, topt, flee)** - Calculates path between two points using distance maps

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

- **compressbooks(books)** - Compresses books to base64 URL string
- **decompressbooks(base64bytes)** - Decompresses books from base64 URL string
- **memoryadminmenu(player)** - Shows admin menu with player list and utilities
