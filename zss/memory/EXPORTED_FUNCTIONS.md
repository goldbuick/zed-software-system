# Memory Module - Exported Functions Summary

## boardelement.ts

- **memoryapplyboardelementcolor(element, strcolor)** - Applies color string to element
- **memoryexportboardelement(boardelement)** - Exports element to serializable format
- **memoryimportboardelement(boardelemententry)** - Imports element from serialized format
- **memoryboardelementisobject(element)** - Checks if element is an object (not terrain)
- **memorycreateboardelement()** - Creates a new board element

## boardlookup.ts

- **memorywriteboardnamed(board, element, index?)** - Adds element to named lookup
- **memorywriteboardobjectlookup(board, object)** - Updates object in position lookup
- **memorydeleteboardobjectnamedlookup(board, object)** - Removes object from lookups
- **memoryresetboardlookups(board)** - Resets and rebuilds lookup tables
- **memoryinitboardlookup(board)** - Builds lookup tables for a board
- **memorydeleteboardterrainnamed(board, terrain)** - Removes terrain from named lookup

## boardmovement.ts

- **memorycheckblockedboardobject(board, collision, dest, isplayer?)** - Checks if a destination is blocked
- **memorycheckmoveboardobject(board, target, dest)** - Checks if an object can move to destination
- **memorycleanupboard(board, timestamp)** - Cleans up deleted elements from a board
- **memorymoveboardobject(board, element, dest)** - Low-level object movement on a board
- **memorymoveobject(book, board, element, dest, didpush?)** - Moves an object with collision, pushing, and interaction handling

## boardoperations.ts

- **memorydeleteboardobject(board, id)** - Deletes an object from a board
- **memoryboardelementindex(board, pt)** - Converts point to board index
- **memoryreadboardelement(board, pt)** - Reads element at a point (object or terrain)
- **memoryreadboardelementbyidorindex(board, idorindex)** - Reads element by ID or index
- **memoryevaldir(board, element, player, dir, startpt)** - Evaluates direction commands into destination points
- **memoryexportboard(board)** - Exports a board to a serializable format
- **memoryfindboardplayer(board, target, player)** - Finds a player element for targeting
- **memorygetboardterrain(board, x, y)** - Gets terrain at coordinates
- **memoryimportboard(boardentry)** - Imports a board from serialized format
- **memorycreateboardobject(board, from)** - Creates a new object on a board
- **memorycreateboardobjectfromkind(board, pt, kind, id?)** - Creates object from kind string
- **memoryreadboardobject(board, id)** - Gets an object by ID
- **memoryreadboardobjectbypt(board, pt)** - Gets object at a point
- **memoryreadboardobjects(board)** - Gets all objects on a board
- **memoryreadboardgroup(board, self, targetgroup)** - Reads elements matching a group specification
- **memorysafedeleteelement(board, element, timestamp)** - Safely deletes an element (marks for cleanup)
- **memorysetboardterrain(board, from)** - Sets terrain at a position
- **memorysetboardterrainfromkind(board, pt, kind)** - Sets terrain from a kind string
- **memorytickboard(board, timestamp)** - Prepares code execution list for a board
- **memoryupdateboardvisuals(board)** - Updates board visual caches (over/under/charset/palette)
- **memorycreateboard(fn?)** - Creates a new empty board
- **memoryplayerblockedbyedge(book, board, element, dest)** - Checks if player movement is blocked by board edge
- **memoryplayerwaszapped(book, board, element, id)** - Checks if player was zapped (hit edge or solid)
- **memoryptwithinboard(pt)** - Checks if a point is within board bounds

## bookoperations.ts

- **memoryreadelementcodepage(book, element)** - Gets code page for a board element
- **memoryclearbookcodepage(book, address)** - Removes a code page from a book
- **memoryclearbookflags(book, id)** - Clears flags for an ID
- **memoryreadelementdisplay(element, defaultchar?, defaultcolor?, defaultbg?)** - Gets display properties for an element
- **memoryensurebookcodepagewithtype(book, type, address)** - Ensures code page exists, creates if missing
- **memoryexportbook(book)** - Exports book to serializable format
- **memoryhasbookflags(book, id)** - Checks if flags exist for an ID
- **memoryhasbookmatch(book, ids)** - Checks if book matches any ID
- **memoryimportbook(bookentry)** - Imports book from serialized format
- **memoryreadbookboard(book, address)** - Reads a board from a book
- **memoryreadbookcodepagebyaddress(book, address)** - Finds code page by ID or name
- **memoryreadbookcodepagedatabytype(book, type)** - Gets typed data for all code pages of a type
- **memoryreadbookcodepagesbytype(book, type)** - Gets all code pages of a type
- **memoryreadbookcodepagesbytypeandstat(book, type, statname)** - Gets code pages by type and stat
- **memoryreadbookcodepagewithtype(book, type, address)** - Finds code page by type and address
- **memoryreadbookcodepagesbystat(book, statname)** - Finds code pages matching a stat
- **memoryreadbookflag(book, id, name)** - Reads a specific flag value
- **memoryreadbookflags(book, id)** - Reads flags for an ID
- **memoryreadbookcodepagessorted(book)** - Gets code pages sorted by type and name
- **memoryupdatebookname(book)** - Updates book name
- **memoryupdatebooktoken(book)** - Updates book token
- **memorywritebookcodepage(book, codepage)** - Adds a code page to a book
- **memorywritebookflag(book, id, name, value)** - Writes a flag value
- **memorycreatebook(pages)** - Creates a new book

## cliruntime.ts

- **memorycleanup()** - Performs garbage collection
- **memoryruncli(player, cli, tracking?)** - Executes CLI command for a player
- **memoryrepeatclilast(player)** - Repeats last CLI command
- **memoryresetchipafteredit(object)** - Halts a chip after editing
- **memoryrestartallchipsandflags()** - Halts all chips and clears flags
- **memoryruncodepage(address)** - Runs a code page once
- **memoryunlockscroll(id, player)** - Unlocks scroll for a player
- **memorystartloader(id, code)** - Starts a loader with code

## codepageoperations.ts

- **memoryexportbitmap(bitmap)** - Exports bitmap to serializable format
- **memoryimportbitmap(bitmapentry)** - Imports bitmap from serialized format
- **memoryapplyelementstats(stats, element)** - Applies code page stats to a board element
- **memoryexportcodepage(codepage)** - Exports codepage to serializable format
- **memorycodepagehasmatch(codepage, type, ids)** - Checks if codepage matches type and IDs
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
- **memorycodepagetypetostring(type)** - Converts code page type enum to string
- **memorycreatecodepage(code, content)** - Creates a new code page

## gameloop.ts

- **memorywritemessage(message)** - Sends a message to the OS message system
- **memorysendtoboards(target, message, data, boards)** - Sends messages to elements across multiple boards
- **memorysendtoelement(fromelement, toelement, label)** - Sends a message between elements
- **memorysendtoelements(chip, fromelement, send)** - Sends messages to multiple elements based on target spec
- **memorysendtolog(board, element, text)** - Sends a formatted log message
- **memorytickmain(playeronly?)** - Main game tick function, updates all boards and runs code
- **memorytickobject(book, board, object, code)** - Ticks a single object's code

## index.ts

- **memoryreadloaders()** - Returns the loaders map (internal)
- **memoryreadsession()** - Returns the current session ID
- **memoryreadoperator()** - Returns the current operator/player ID
- **memoryisoperator(player)** - Checks if a player is the current operator
- **memorywriteoperator(operator)** - Sets the current operator
- **memoryreadtopic()** - Returns the current multiplayer topic
- **memorywritetopic(topic)** - Sets the multiplayer topic
- **memorywritehalt(halt)** - Sets the halt state
- **memoryreadhalt()** - Returns the halt state
- **memoryreadbooklist()** - Returns all books in memory
- **memoryreadfirstbook()** - Returns the first book
- **memoryreadfirstcontentbook()** - Returns the first content book (excluding main)
- **memoryreadbookbyaddress(address)** - Finds a book by ID or name
- **memorywritesoftwarebook(slot, book)** - Sets a book for a software slot (main/temp)
- **memoryreadbookbysoftware(slot)** - Gets the book for a software slot
- **memorycreatesoftwarebook(maybename?)** - Creates a new software book
- **memoryensurebookbyname(name)** - Ensures a book exists by name, creates if missing
- **memoryensuresoftwarebook(slot, maybename?)** - Ensures a software book exists for a slot
- **memoryensuresoftwarecodepage(slot, address, createtype)** - Ensures a codepage exists in a software book
- **memorypickcodepagewithtype(type, address)** - Finds a codepage by type and address across all books
- **memorylistcodepagewithtype(type)** - Lists all codepages of a specific type across all books
- **memoryreadelementkind(element)** - Reads and caches the kind data for an element
- **memoryreadelementstat(element, stat)** - Reads a stat value from element, kind, or codepage with defaults
- **memorycheckelementpushable(pusher, target)** - Checks if target can be pushed by pusher
- **memorywriteelementfromkind(board, kind, dest, id?)** - Creates an object or terrain from a kind string
- **memorywritebullet(board, kind, dest)** - Creates a bullet object from a kind string
- **memoryreadboard(address)** - Reads a board codepage by address
- **memoryreadoverboard(board)** - Reads the over board for a board
- **memoryreadunderboard(board)** - Reads the under board for a board
- **memoryreadflags(id)** - Reads flags for an ID
- **memoryhasflags(id)** - Checks if flags exist for an ID
- **memoryclearflags(id)** - Clears flags for an ID
- **memoryresetbooks(books)** - Resets all books with new array
- **memorywritebook(book)** - Adds/updates a book in memory
- **memoryclearbook(address)** - Removes a book from memory
- **memoryinitboard(board)** - Initializes a board (loads kinds, builds lookups)

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

- **memorymoveplayertoboard(book, player, board, dest)** - Moves player to a different board
- **memoryreadbookplayeractive(book, player)** - Checks if player is in active list
- **memoryreadbookplayerboards(book)** - Gets all boards with active players
- **memorywritebookplayerboard(book, player, board)** - Sets player's current board
- **memoryloginplayer(player, stickyflags)** - Logs in a player, places them on a board
- **memorylogoutplayer(player, isendgame)** - Logs out a player, cleans up their state
- **memoryscanplayers(players)** - Scans and tracks all player IDs across boards
- **memoryreadplayeractive(player)** - Checks if a player is active and on a board
- **memoryreadplayerboard(player)** - Gets the board a player is currently on

## rendering.ts

- **memorycreatecachedsprite(player, index, id, spriteindex)** - Creates a cached sprite for rendering
- **memorycodepagetoprefix(codepage)** - Gets display prefix for a code page
- **memoryconverttogadgetcontrollayer(player, index, board)** - Creates control layer for gadget rendering
- **memoryconverttogadgetlayers(player, index, board, tickers, whichlayer, multi?)** - Converts board to gadget render layers
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

## utilities.ts

- **memorycompressbooks(books)** - Compresses books to base64 URL string
- **memorydecompressbooks(base64bytes)** - Decompresses books from base64 URL string
- **memoryadminmenu(player)** - Shows admin menu with player list and utilities
