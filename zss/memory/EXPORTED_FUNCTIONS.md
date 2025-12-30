# Memory Module - Exported Functions Summary

## Core Memory Management

### Session & State
- **memoryreadsession()** - Returns the current session ID
- **memoryreadoperator()** - Returns the current operator/player ID
- **memoryisoperator(player)** - Checks if a player is the current operator
- **memorywriteoperator(operator)** - Sets the current operator
- **memoryreadtopic()** - Returns the current multiplayer topic
- **memorywritetopic(topic)** - Sets the multiplayer topic
- **memorywritehalt(halt)** - Sets the halt state
- **memoryreadhalt()** - Returns the halt state

### Book Management
- **memoryreadbooklist()** - Returns all books in memory
- **memoryreadfirstbook()** - Returns the first book
- **memoryreadfirstcontentbook()** - Returns the first content book (excluding main)
- **memoryreadbookbyaddress(address)** - Finds a book by ID or name
- **memorysetsoftwarebook(slot, book)** - Sets a book for a software slot (main/temp)
- **memoryreadbookbysoftware(slot)** - Gets the book for a software slot
- **memorycreatesoftwarebook(maybename?)** - Creates a new software book
- **memoryensurebookbyname(name)** - Ensures a book exists by name, creates if missing
- **memoryensuresoftwarebook(slot, maybename?)** - Ensures a software book exists for a slot
- **memoryensuresoftwarecodepage(slot, address, createtype)** - Ensures a codepage exists in a software book
- **memoryresetbooks(books)** - Resets all books with new array
- **memorysetbook(book)** - Adds/updates a book in memory
- **memoryclearbook(address)** - Removes a book from memory

### Code Page Management
- **memorypickcodepagewithtype(type, address)** - Finds a codepage by type and address across all books
- **memorylistcodepagewithtype(type)** - Lists all codepages of a specific type across all books

### Element Operations
- **memoryelementkindread(element)** - Reads and caches the kind data for an element
- **memoryelementstatread(element, stat)** - Reads a stat value from element, kind, or codepage with defaults
- **memoryelementcheckpushable(pusher, target)** - Checks if target can be pushed by pusher
- **memorywritefromkind(board, kind, dest, id?)** - Creates an object or terrain from a kind string
- **memorywritebullet(board, kind, dest)** - Creates a bullet object from a kind string

### Board Operations
- **memoryboardread(address)** - Reads a board codepage by address
- **memoryoverboardread(board)** - Reads the over board for a board
- **memoryunderboardread(board)** - Reads the under board for a board
- **memoryboardinit(board)** - Initializes a board (loads kinds, builds lookups)

### Flags Management
- **memoryreadflags(id)** - Reads flags for an ID
- **memoryhasflags(id)** - Checks if flags exist for an ID
- **memoryclearflags(id)** - Clears flags for an ID

## Player Management

- **memoryplayerlogin(player, stickyflags)** - Logs in a player, places them on a board
- **memoryplayerlogout(player, isendgame)** - Logs out a player, cleans up their state
- **memoryreadplayerboard(player)** - Gets the board a player is currently on
- **memoryreadplayeractive(player)** - Checks if a player is active and on a board
- **memoryplayerscan(players)** - Scans and tracks all player IDs across boards
- **bookplayerreadactive(book, player)** - Checks if player is in active list
- **bookplayersetboard(book, player, board)** - Sets player's current board
- **bookplayermovetoboard(book, player, board, dest)** - Moves player to a different board
- **bookplayerreadboards(book)** - Gets all boards with active players

## Game Loop & Execution

### Tick & Update
- **memorytick(playeronly?)** - Main game tick function, updates all boards and runs code
- **memorytickobject(book, board, object, code)** - Ticks a single object's code
- **boardtick(board, timestamp)** - Prepares code execution list for a board

### Movement & Collision
- **memorymoveobject(book, board, element, dest, didpush?)** - Moves an object with collision, pushing, and interaction handling
- **boardmoveobject(board, element, dest)** - Low-level object movement on a board
- **boardcheckblockedobject(board, collision, dest, isplayer?)** - Checks if a destination is blocked
- **boardcheckmoveobject(board, target, dest)** - Checks if an object can move to destination

### Messaging
- **memorymessage(message)** - Sends a message to the OS message system
- **memorysendtoelement(fromelement, toelement, label)** - Sends a message between elements
- **memorysendtoelements(chip, fromelement, send)** - Sends messages to multiple elements based on target spec
- **memorysendtoboards(target, message, data, boards)** - Sends messages to elements across multiple boards
- **memorysendtolog(board, element, text)** - Sends a formatted log message

## Board Operations

### Board Creation & Management
- **createboard(fn?)** - Creates a new empty board
- **boardexport(board)** - Exports a board to a serializable format
- **boardimport(boardentry)** - Imports a board from serialized format
- **boardvisualsupdate(board)** - Updates board visual caches (over/under/charset/palette)

### Element Access
- **boardelementread(board, pt)** - Reads element at a point (object or terrain)
- **boardelementreadbyidorindex(board, idorindex)** - Reads element by ID or index
- **boardgetterrain(board, x, y)** - Gets terrain at coordinates
- **boardobjectread(board, id)** - Gets an object by ID
- **boardobjectsread(board)** - Gets all objects on a board
- **boardobjectreadbypt(board, pt)** - Gets object at a point
- **boardelementindex(board, pt)** - Converts point to board index

### Element Creation & Modification
- **boardsetterrain(board, from)** - Sets terrain at a position
- **boardterrainsetfromkind(board, pt, kind)** - Sets terrain from a kind string
- **boardobjectcreate(board, from)** - Creates a new object on a board
- **boardobjectcreatefromkind(board, pt, kind, id?)** - Creates object from kind string
- **boardsafedelete(board, element, timestamp)** - Safely deletes an element (marks for cleanup)
- **boarddeleteobject(board, id)** - Deletes an object from a board
- **createboardelement()** - Creates a new board element
- **boardelementexport(boardelement)** - Exports element to serializable format
- **boardelementimport(boardelemententry)** - Imports element from serialized format
- **boardelementisobject(element)** - Checks if element is an object (not terrain)
- **boardelementapplycolor(element, strcolor)** - Applies color string to element

### Board Utilities
- **ptwithinboard(pt)** - Checks if a point is within board bounds
- **boardfindplayer(board, target, player)** - Finds a player element for targeting
- **boardevaldir(board, element, player, dir, startpt)** - Evaluates direction commands into destination points
- **boardreadgroup(board, self, targetgroup)** - Reads elements matching a group specification

### Board Lookup & Indexing
- **boardsetlookup(board)** - Builds lookup tables for a board
- **boardresetlookups(board)** - Resets and rebuilds lookup tables
- **boardnamedwrite(board, element, index?)** - Adds element to named lookup
- **boardobjectlookupwrite(board, object)** - Updates object in position lookup
- **boardterrainnameddelete(board, terrain)** - Removes terrain from named lookup
- **boardobjectnamedlookupdelete(board, object)** - Removes object from lookups

## Code Page Operations

### Code Page Creation & Management
- **createcodepage(code, content)** - Creates a new code page
- **codepageexport(codepage)** - Exports codepage to serializable format
- **codepageimport(codepageentry)** - Imports codepage from serialized format
- **codepagehasmatch(codepage, type, ids)** - Checks if codepage matches type and IDs

### Code Page Reading
- **codepagereadtype(codepage)** - Gets the type of a code page
- **codepagereadtypetostring(codepage)** - Gets type as string
- **codepagereadname(codepage)** - Gets the name of a code page
- **codepagereadstat(codepage, stat)** - Reads a specific stat from code page
- **codepagereadstats(codepage)** - Reads all stats from code page (cached)
- **codepagereadstatdefaults(codepage)** - Reads stats excluding type/name
- **codepagereadstatsfromtext(content)** - Parses stats from code text
- **codepageresetstats(codepage)** - Resets cached stats
- **codepagereaddata(codepage)** - Gets typed data from code page (board/object/terrain/etc)
- **codepagetypetostring(type)** - Converts code page type enum to string

### Code Page Application
- **codepageapplyelementstats(stats, element)** - Applies code page stats to a board element

### Bitmap Operations
- **bitmapexport(bitmap)** - Exports bitmap to serializable format
- **bitmapimport(bitmapentry)** - Imports bitmap from serialized format

## Book Operations

### Book Creation & Management
- **createbook(pages)** - Creates a new book
- **bookexport(book)** - Exports book to serializable format
- **bookimport(bookentry)** - Imports book from serialized format
- **bookupdatename(book)** - Updates book name
- **bookupdatetoken(book)** - Updates book token
- **bookhasmatch(book, ids)** - Checks if book matches any ID

### Code Page Access
- **bookreadcodepagebyaddress(book, address)** - Finds code page by ID or name
- **bookreadcodepagesbystat(book, statname)** - Finds code pages matching a stat
- **bookreadcodepagewithtype(book, type, address)** - Finds code page by type and address
- **bookensurecodepagewithtype(book, type, address)** - Ensures code page exists, creates if missing
- **bookreadcodepagesbytype(book, type)** - Gets all code pages of a type
- **bookreadcodepagesbytypeandstat(book, type, statname)** - Gets code pages by type and stat
- **bookreadcodepagedatabytype(book, type)** - Gets typed data for all code pages of a type
- **bookreadsortedcodepages(book)** - Gets code pages sorted by type and name
- **bookboardelementreadcodepage(book, element)** - Gets code page for a board element
- **bookwritecodepage(book, codepage)** - Adds a code page to a book
- **bookclearcodepage(book, address)** - Removes a code page from a book

### Board Access
- **bookreadboard(book, address)** - Reads a board from a book

### Flags Management
- **bookhasflags(book, id)** - Checks if flags exist for an ID
- **bookreadflags(book, id)** - Reads flags for an ID
- **bookclearflags(book, id)** - Clears flags for an ID
- **bookreadflag(book, id, name)** - Reads a specific flag value
- **bookwriteflag(book, id, name, value)** - Writes a flag value

### Element Display
- **bookelementdisplayread(element, defaultchar?, defaultcolor?, defaultbg?)** - Gets display properties for an element

## Spatial Queries & Pathfinding

### Collision
- **boardcheckcollide(source, dest)** - Checks if two collision types collide

### Finding Elements
- **boardfindplayerforelement(board, elementpt, player)** - Finds player element for targeting
- **boardpicknearestpt(pt, items)** - Picks nearest element to a point
- **boardpickfarthestpt(pt, items)** - Picks farthest element from a point

### Listing Elements
- **boardlistelementsbyempty(board)** - Lists points with empty elements
- **boardlistnamedelements(board, name)** - Lists elements with a specific name
- **boardlistptsbyempty(board)** - Lists empty points
- **boardlistelementsbykind(board, kind)** - Lists elements matching a kind string
- **boardlistelementsbycolor(board, strcolor)** - Lists elements matching a color
- **boardlistelementsbyidnameorpts(board, idnameorpts)** - Lists elements by ID, name, or points

### Pathfinding
- **boardreadpath(board, forcollision, frompt, topt, flee)** - Calculates path between two points using distance maps

## Rendering & Display

### Rendering & Gadget Conversion
- **memoryconverttogadgetlayers(player, index, board, tickers, whichlayer, multi?)** - Converts board to gadget render layers
- **memoryconverttogadgetcontrollayer(player, index, board)** - Creates control layer for gadget rendering
- **memoryreadgadgetlayers(player, board)** - Reads complete gadget layer data for a board
- **createcachedsprite(player, index, id, spriteindex)** - Creates a cached sprite for rendering

### Display & Formatting
- **memorycodepagetoprefix(codepage)** - Gets display prefix for a code page
- **memoryelementtodisplayprefix(element)** - Gets display prefix for an element
- **memoryelementtologprefix(element)** - Gets log prefix for an element

## Inspection & Editing

### Element Inspection
- **memoryinspect(player, p1, p2)** - Main inspection function for elements or areas
- **memoryinspectcommand(path, player)** - Handles inspection command actions
- **memoryinspectelement(player, board, codepage, element, p1, isobject)** - Inspects a single element
- **memoryinspectcolor(player, element, name)** - Inspects/edits element color
- **memoryinspectchar(player, element, name)** - Inspects/edits element character

### Area Inspection
- **memoryinspectarea(player, p1, p2, hassecretheap)** - Inspects a rectangular area
- **memoryinspectchararea(player, p1, p2, name)** - Batch edits characters in an area
- **memoryinspectcolorarea(player, p1, p2, name)** - Batch edits colors in an area
- **memoryinspectbgarea(player, p1, p2, name)** - Batch edits backgrounds in an area

### Batch Operations
- **memoryinspectbatchcommand(path, player)** - Handles batch operation commands
- **memoryinspectempty(player, p1, p2, mode)** - Empties elements in an area
- **memoryinspectemptymenu(player, p1, p2)** - Shows empty operation menu

### Copy/Paste Operations
- **memoryinspectcopy(player, p1, p2, mode)** - Copies elements to clipboard
- **memoryinspectcopymenu(player, p1, p2)** - Shows copy operation menu
- **memoryinspectcut(player, p1, p2, mode)** - Cuts elements to clipboard
- **memoryinspectcutmenu(player, p1, p2)** - Shows cut operation menu
- **memoryinspectpaste(player, p1, p2, mode)** - Pastes elements from clipboard
- **memoryinspectpastemenu(player, p1, p2)** - Shows paste operation menu
- **readsecretheap()** - Reads clipboard buffer
- **hassecretheap()** - Checks if clipboard has data

### Style Operations
- **memoryinspectstyle(player, p1, p2, mode)** - Applies style from clipboard to area
- **memoryinspectstylemenu(player, p1, p2)** - Shows style operation menu
- **readstyleconfig()** - Reads style configuration
- **writestyleconfig(updater)** - Writes style configuration

### Remix Operations
- **memoryinspectremixcommand(path, player)** - Handles remix commands
- **memoryinspectremixmenu(player, p1, p2)** - Shows remix operation menu
- **readremixconfig()** - Reads remix configuration
- **writeremixconfig(updater)** - Writes remix configuration

### Gadget Inspection
- **gadgetinspectloaders(player, p1, p2)** - Shows gadget action loaders
- **gadgetinspectboard(player, board)** - Shows board information in gadget

### Find Operations
- **memoryfindanymenu(player)** - Shows find menu with configurable search slots
- **memoryfindany(path, player)** - Executes find operation
- **readfindanyconfig()** - Reads find configuration
- **writefindanyconfig(updater)** - Writes find configuration

### Make It (Code Page Creation)
- **memorymakeitscroll(makeit, player)** - Shows code page creation scroll
- **memorymakeitcommand(path, data, player)** - Handles code page creation commands

## Loader System

- **memoryloadermatches(format, idoreventname)** - Finds loaders matching format/event
- **memoryloader(arg, format, idoreventname, content, player)** - Runs matching loaders
- **memoryloaderarg(id)** - Gets loader argument
- **memoryloaderformat(id)** - Gets loader format
- **memoryloadercontent(id)** - Gets loader content
- **memoryloaderplayer(id)** - Gets loader player
- **memoryloaderdone(id)** - Marks loader as done
- **memorystartloader(id, code)** - Starts a loader with code

## CLI & Runtime

### CLI Operations
- **memorycli(player, cli, tracking?)** - Executes CLI command for a player
- **memoryclirepeatlast(player)** - Repeats last CLI command
- **memoryrun(address)** - Runs a code page once

### System Operations
- **memorycleanup()** - Performs garbage collection
- **memoryrestartallchipsandflags()** - Halts all chips and clears flags
- **memoryresetchipafteredit(object)** - Halts a chip after editing
- **memoryscrollunlock(id, player)** - Unlocks scroll for a player

## Utilities

### Compression & Serialization
- **compressbooks(books)** - Compresses books to base64 URL string
- **decompressbooks(base64bytes)** - Decompresses books from base64 URL string

### Admin Operations
- **memoryadminmenu(player)** - Shows admin menu with player list and utilities

### Types & Enums
- **MEMORY_LABEL** (enum) - Labels for memory slots (MAIN, TEMP, TITLE, PLAYER, GADGETSTORE)
- **MEMORY_GADGET_LAYERS** (type) - Type for gadget layer data
- **FINDANY_CONFIG** (type) - Configuration for find operations
- **BOOK_RUN_ARGS** (type) - Arguments for board tick execution
