# Words Module - Exported Functions Summary

## Expression Evaluation

### Core Expression Reading
- **readexpr(index)** - Reads and evaluates expressions from word tokens, handles constants, flags, and built-in expressions (ZZT-compatible like ALIGNED, CONTACT, BLOCKED, ANY, COUNTOF; ZSS-specific like RND, ABS, MIN, MAX, PICK, RUN, etc.)

## Direction & Point Operations

### Point Utilities
- **ispt(value)** - Type guard to check if value is a point (has x and y properties)
- **ptapplydir(pt, dir)** - Applies a direction (NORTH/SOUTH/WEST/EAST) to a point, modifying coordinates
- **dirfromdelta(dx, dy)** - Converts delta x/y coordinates to a direction enum
- **dirfrompts(last, current)** - Converts two points to a direction based on their delta

### Direction Reading & Parsing
- **readdir(index)** - Reads and parses direction expressions from word tokens, handles complex directions (AT, BY, WITHIN, AWAYBY, modifiers like CW, CCW, OPP, etc.)
- **isstrdir(value)** - Type guard to check if value is a string direction array
- **mapstrdir(value)** - Maps a string value to a direction constant
- **mapstrdirtoconst(value)** - Maps a string direction to DIR enum value

### Direction Constants & Types
- **dirconsts** (const) - Object mapping direction names to their constant string values

## Text Formatting & Tokenization

### Tokenization
- **tokenize(text, noWhitespace?)** - Tokenizes text into lexical tokens (strings, numbers, flags, colors, etc.)
- **hascenter(text)** - Checks if text contains $CENTER directive, returns text without center if found

### Token Constants
- **Whitespace**, **WhitespaceSkipped**, **Newline**, **StringLiteral**, **StringLiteralDouble**, **EscapedDollar**, **MaybeFlag**, **Center**, **MetaKey**, **NumberLiteral**, **HyperLinkText** (tokens) - Lexer token definitions
- **allTokens** (const) - Array of all token definitions for lexer

### Text Writing Context
- **WRITE_TEXT_CONTEXT** (type) - Context for text formatting (cursor, colors, edges)
- **createwritetextcontext(width, height, color, bg, topedge?, leftedge?, rightedge?, bottomedge?)** - Creates a context for text formatting operations
- **applywritetextcontext(dest, source)** - Applies cursor position and active colors from source context to dest
- **writetextreset(context)** - Resets active colors/edges to reset values in context
- **textformatedges(topedge, leftedge, rightedge, bottomedge, context)** - Sets edge boundaries for text formatting
- **textformatreadedges(context)** - Reads edge boundaries from context, returns left/right/top/bottom/width/height

### Text Formatting Operations
- **tokenizeandwritetextformat(text, context, shouldreset)** - Tokenizes text and writes formatted output to context
- **tokenizeandstriptextformat(text)** - Tokenizes text and strips formatting codes, returns plain text
- **tokenizeandmeasuretextformat(text, width, height)** - Tokenizes text and measures dimensions without rendering
- **writeplaintext(text, context, shouldreset)** - Writes plain text (no formatting) to context

### Text Context Manipulation
- **applystrtoindex(p1, str, context)** - Applies a string to context starting at index p1
- **applycolortoindexes(p1, p2, color, bg, context)** - Applies color and background to a range of indexes
- **applybgtoindexes(p1, p2, bg, context)** - Applies background color to a range of indexes
- **clippedapplycolortoindexes(index, rightedge, p1, p2, color, bg, context)** - Applies colors to indexes with boundary clipping
- **clippedapplybgtoindexes(index, rightedge, p1, p2, color, context)** - Applies background color to indexes with boundary clipping

## Color Operations

### Color Conversion
- **colortofg(color)** - Converts COLOR enum to foreground color number (filters out background colors)
- **colortobg(color)** - Converts COLOR enum background color to background number

### Color String Operations
- **readcolor(index)** - Reads color expression from word tokens (supports numeric colors and string color constants)
- **readstrcolor(value)** - Extracts foreground COLOR from STR_COLOR array
- **readstrbg(value)** - Extracts background COLOR from STR_COLOR array
- **mapstrcolor(value)** - Maps a string value to a color constant name
- **mapcolortostrcolor(color, bg)** - Converts COLOR enum values to STR_COLOR array format
- **mapstrcolortoattributes(strcolor)** - Converts STR_COLOR array to color/bg attributes object

### Color Type Checking
- **isstrcolor(value)** - Type guard to check if value is a string color array
- **isbgstrcolor(value)** - Type guard to check if value is a background string color
- **iscolormatch(pattern, color, bg)** - Checks if color/bg match a color pattern

### Color Constants
- **colorconsts** (const) - Object mapping color names to their constant string values (includes aliases like brown, gray/grey variants)

## Kind Operations

### Kind Reading & Parsing
- **readkind(index)** - Reads kind expression from word tokens (name with optional color)
- **readname(index)** - Reads a name string from word tokens
- **isstrkind(value)** - Type guard to check if value is a string kind array [name, color?]

### Kind Extraction
- **STR_KIND** (type) - Kind tuple [name, color?]
- **readstrkindname(kind)** - Extracts name string from STR_KIND
- **readstrkindcolor(kind)** - Extracts foreground COLOR from STR_KIND
- **readstrkindbg(kind)** - Extracts background COLOR from STR_KIND

## Category Operations

### Category Reading & Parsing
- **readcategory(index)** - Reads category expression from word tokens (ISTERRAIN/ISOBJECT)
- **isstrcategory(value)** - Type guard to check if value is a string category array
- **mapstrcategory(value)** - Maps a string value to a category constant

### Category Constants
- **categoryconsts** (const) - Object mapping category names to constant string values (ISTERRAIN, ISOBJECT)

## Collision Operations

### Collision Reading & Parsing
- **readcollision(index)** - Reads collision expression from word tokens (ISWALK, ISSOLID, ISSWIM, ISBULLET, ISGHOST)
- **isstrcollision(value)** - Type guard to check if value is a string collision array
- **mapstrcollision(value)** - Maps a string value to a collision constant
- **mapstrcollisiontoenum(value)** - Maps STR_COLLISION to COLLISION enum value

### Collision Constants
- **collisionconsts** (const) - Object mapping collision names to constant string values
- **collisionenums** (const) - Object mapping collision names to COLLISION enum values

## Stat Formatting

- **statformat(label, words, first?)** - Formats stat definitions from word arrays, determines stat type (LOADER, BOARD, OBJECT, TERRAIN, CONST, RANGE, SELECT, NUMBER, TEXT, HOTKEY, etc.)
- **stattypestring(type)** - Converts STAT_TYPE enum to string representation

## Command Parsing

### Argument Reading
- **readargs(words, index, args)** - Parses typed arguments from word array based on ARG_TYPE specification (COLOR, KIND, DIR, NAME, NUMBER, STRING, etc.)
- **ARG_TYPE** (enum) - Enumeration of argument types for type-safe parsing
- **ARG_TYPE_MAP** (type) - Maps ARG_TYPE to parsed value types
- **READ_CONTEXT** (const) - Global context object containing current parsing state (book, board, element, words, get function)

### Send Command Parsing
- **parsesend(words, candirsend?)** - Parses SEND command syntax, extracts target direction/name, label, and arguments
- **SEND_META** (type) - Type definition for parsed send command metadata

## Type Utilities

### Core Types
- **NAME(name)** - Normalizes a name string (lowercase, trim)

### Type Definitions & Enums
- **COLOR** (enum) - Color enumeration (foreground, background, blinking variants)
- **COLLISION** (enum) - Collision type enumeration (ISWALK, ISSOLID, ISSWIM, ISBULLET, ISGHOST)
- **CATEGORY** (enum) - Category enumeration (ISTERRAIN, ISOBJECT)
- **DIR** (enum) - Direction enumeration (IDLE, NORTH, SOUTH, WEST, EAST, modifiers, pathfinding, etc.)
- **STAT_TYPE** (enum) - Stat type enumeration (LOADER, BOARD, OBJECT, TERRAIN, CHARSET, PALETTE, CONST, RANGE, SELECT, NUMBER, TEXT, HOTKEY, COPYIT, OPENIT, VIEWIT, RUNIT, ZSSEDIT, CHAREDIT, COLOREDIT)
- **STAT** (type) - Stat structure with type and values array
- **PT** (type) - Point type with x and y coordinates
- **WORD** (type) - Word type (string | number | undefined | WORD[])
- **WORD_RESULT** (type) - Word result type (0 | 1)

## System Constants

- **ismac** (const) - Boolean indicating if running on Mac
- **islinux** (const) - Boolean indicating if running on Linux
- **metakey** (const) - Meta key string ('cmd' on Mac, 'ctrl' on others)

