# Firmware Commands Summary

This document lists all `.command('name', ...` invocations organized by firmware file.

## cli.ts (CLI_FIRMWARE)

**Total: 32 commands**

### Messaging

- `help` - Open reference scroll

### Book & Page Management

- `bookrename` - Rename the main book (operator only)
- `booktrash` - Trash a book by address (operator only)
- `boardopen` - Used to move player to board
- `pageopen` - Open a code page editor
- `pagetrash` - Trash a code page (operator only)
- `books` - List all books
- `pages` - List all pages in main book
- `boards` - List all boards as goto hyperlinks
- `trash` - List books/codepages to delete (operator only)

### Game State

- `dev` - Enter dev mode / halt execution (operator only)
- `share` - Register share (operator only)
- `save` - Flush operator changes (operator only)
- `fork` - Fork software (operator only)
- `nuke` - Does a countdown and reloads into an empty state (operator only)
- `endgame` - Logout player
- `restart` - Restart software, deletes all chip and player state (operator only)

### Export

- `export` - Show export menu (operator only)
- `bookexport` - Show book export options (operator only)
- `bookallexport` - Export entire book as JSON (operator only)
- `pageexport` - Export code page as JSON (operator only)
- `itchiopublish` - Publish to itch.io (operator only)
- `zztsearch` - Search ZZT content by field and text
- `zztrandom` - Get random ZZT content

### Editing & Search

- `gadget` - Toggle built-in inspector
- `findany` - Highlight matched elements

### Multiplayer & Social

- `admin` - Show admin interface
- `joincode` - Start multiplayer bridge (operator only)
- `jointab` - Join via tab (operator only)
- `chat` - Start/stop chat channel (operator only)
- `broadcast` - Start/stop stream broadcast (operator only)
- `bbs` - BBS login/publish actions (login, list, publish, delete, restart)

---

## audio.ts (AUDIO_FIRMWARE)

**Total: 52 commands**

### TTS (Text-to-Speech)

- `ttsengine` - Set TTS engine and config
- `tts` - Speak text with voice (or clear queue)
- `ttsqueue` - Queue TTS phrase
- `ttsvol` - Set TTS volume

### Playback

- `bpm` - Set BPM
- `vol` - Set play volume
- `bgvol` - Set background play volume
- `play` - Play music notes
- `bgplay` - Play background music
- `bgplayon64n` - Background play on 64n
- `bgplayon32n` - Background play on 32n
- `bgplayon16n` - Background play on 16n
- `bgplayon8n` - Background play on 8n
- `bgplayon4n` - Background play on 4n
- `bgplayon2n` - Background play on 2n
- `bgplayon1n` - Background play on 1m

### Synthesis

- `synth` - Restart synth or configure multi-voice (applies to #play)
- `synthrecord` - Record saved synth notes to given filename
- `synthflush` - Flush synth, clear saved notes
- `synth1` - Configure synth voice 1
- `synth2` - Configure synth voice 2
- `synth3` - Configure synth voice 3
- `synth4` - Configure synth voice 4
- `synth5` - Configure bgplay synth (voices 4-8)

### Effects (Multi-voice, applies to #play)

- `echo` - Apply echo effect to fx 0-1
- `fcrush` - Apply frequency crush to fx 0-1
- `autofilter` - Apply autofilter to fx 0-1
- `reverb` - Apply reverb to fx 0-1
- `distort` - Apply distortion to fx 0-1
- `vibrato` - Apply vibrato to fx 0-1
- `autowah` - Apply autowah to fx 0-1

### Individual Voice Effects

- `echo1`, `echo2`, `echo3` - Echo for fx 0, 1, 2
- `fcrush1`, `fcrush2`, `fcrush3` - Frequency crush for fx 0, 1, 2
- `autofilter1`, `autofilter2`, `autofilter3` - Autofilter for fx 0, 1, 2
- `reverb1`, `reverb2`, `reverb3` - Reverb for fx 0, 1, 2
- `distort1`, `distort2`, `distort3` - Distortion for fx 0, 1, 2
- `vibrato1`, `vibrato2`, `vibrato3` - Vibrato for fx 0, 1, 2
- `autowah1`, `autowah2`, `autowah3` - Autowah for fx 0, 1, 2

---

## element.ts (ELEMENT_FIRMWARE)

**Total: 20 commands**

### Variable & State

- `clear` - Clear variables (set to 0)
- `set` - Set variable to value
- `array` - Create array variable
- `read` - Read property from object into variable
- `load` - Load code from object codepage into object at given direction

### Element Transformation

- `become` - Transform element into different kind
- `bind` - Copy code from named element
- `char` - Set character (self or at direction)
- `color` - Set color (self or at direction)

### Movement

- `go` - Move element in direction
- `walk` - Will cause element to move in direction each tick
- `idle` - Yield execution until next tick

### Control Flow

- `end` - End program (optionally set 'arg' variable)
- `lock` - Lock against external messages
- `restore` - Restore all labels of given name
- `unlock` - Unlock against messages from others
- `zap` - De-activate first label of given name
- `cycle` - Set element cycle value (1-255)
- `die` - Delete element (halt execution unless @isitem)

### Execution

- `run` - Run object codepage of given name
- `runwith` - Run function with argument

---

## board.ts (BOARD_FIRMWARE)

**Total: 20 commands**

### Board Creation & Navigation

- `build` - Create new board and write id to stat
- `goto` - Teleport player to board by stat with optional x, y
- `transport` - Move element across board with transporter logic

### Object Manipulation

- `shove` - Shove target object in direction
- `push` - Shove target object in direction ONLY if pushable
- `duplicate` / `dupe` - Duplicate element at direction in given direction
- `duplicatewith` / `dupewith` - Duplicate element with argument
- `write` - Write text to board at direction
- `change` - Change elements of one kind to another
- `put` - Put element in direction
- `putwith` - Put element with argument
- `oneof` - Uses given id to ensure only one element of given kind is made
- `oneofwith` - Put element with argument and oneof logic

### Projectiles

- `shoot` - Shoot projectile, with optional kind
- `shootwith` - Shoot projectile with argument
- `throwstar` - Throw star projectile, shorthand for `#shoot <dir> star`
- `throwstarwith` - Throw star with argument

---

## transforms.ts (TRANSFORM_FIRMWARE)

**Total: 6 commands**

- `snapshot` - Create board snapshot
- `revert` - Revert board to snapshot state
- `copy` - Copy region from source to current board
- `remix` - Remix from source with pattern size and mirror to current board
- `weave` - Weave board elements in direction
- `pivot` - Rotate board elements by degrees

---

## runtime.ts (RUNTIME_FIRMWARE)

**Total: 2 commands**

### Lifecycle

- `endgame` - Set health to 0

### UI

- `help` - Open reference scroll

---

## display.ts (DISPLAY_FIRMWARE)

**Total: 2 commands**

- `toast` - Show toast notification
- `ticker` - Sets element ticker text

---

## loader.ts (LOADER_FIRMWARE)

**Total: 7 commands**

### File Operations

- `readline` - Read line from text file
- `readjson` - Read JSON data using JMESPath query
- `readbin` - Read binary data with type specification

### Context Management

- `withboard` - Set board context for element-centric commands
- `withobject` - Set object context by ID
- `userinput` - Simulate user input (up, down, left, right, shoot, ok, cancel)
- `endgame` - No-op (when called in loaders)

---

## network.ts (NETWORK_FIRMWARE)

**Total: 2 commands**

- `fetch` - Fetch URL with label, method, and optional data
- `fetchwith` - Fetch URL with argument, label, method, and optional data

---

## Summary Statistics

- **Total unique commands across all firmware files: ~143**
- **Files with most commands:**
  1. audio.ts - 52 commands
  2. cli.ts - 32 commands
  3. element.ts - 20 commands
  4. board.ts - 20 commands
  5. loader.ts - 7 commands
  6. transforms.ts - 6 commands
  7. runtime.ts - 2 commands
  8. network.ts - 2 commands
  9. display.ts - 2 commands

Note: Some commands appear in multiple firmware files (e.g., `endgame`, `help`) with different implementations for different contexts.
