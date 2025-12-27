# Firmware Commands Summary

This document lists all `.command('name', ...` invocations organized by firmware file.

## cli.ts (CLI_FIRMWARE)

**Total: 50 commands**

### Communication & Display

- `shortsend` - Send message with loader fallback for 'self' target
- `send` - Send message to elements
- `stat` - Make text scroll in UI
- `text` - Update player element ticker and log text
- `hyperlink` - Create hyperlink with label and words

### Book & Page Management

- `bookrename` - Rename the main book (operator only)
- `booktrash` - Trash a book by address (operator only)
- `boardopen` - Open a board by stat name
- `pageopen` - Open a code page editor
- `pagetrash` - Trash a code page (operator only)
- `help` - Show reference scroll
- `books` - List all books
- `pages` - List all pages in main book
- `boards` - List all boards
- `trash` - Show trash view (operator only)

### Game State

- `dev` - Enter dev mode / halt execution (operator only)
- `share` - Register share (operator only)
- `save` - Flush operator changes (operator only)
- `fork` - Fork software (operator only)
- `nuke` - Register nuke (operator only)
- `endgame` - Logout player
- `restart` - Restart software (operator only)

### Export

- `export` - Show export menu (operator only)
- `bookexport` - Show book export options (operator only)
- `bookallexport` - Export entire book as JSON (operator only)
- `pageexport` - Export code page as JSON (operator only)
- `itchiopublish` - Publish to itch.io (operator only)

### Editing & Search

- `gadget` - Toggle built-in inspector
- `findany` - Register find any with selection points
- `zztsearch` - Search ZZT content by field and text
- `zztrandom` - Get random ZZT content

### Multiplayer & Social

- `admin` - Show admin interface
- `joincode` - Start multiplayer bridge (operator only)
- `jointab` - Join via tab (operator only)
- `chat` - Start/stop chat channel (operator only)
- `broadcast` - Start/stop stream broadcast (operator only)
- `bbs` - BBS login/logout/actions

---

## audio.ts (AUDIO_FIRMWARE)

**Total: 42 commands**

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
- `synthrecord` - Record synth to filename
- `synthflush` - Flush synth
- `synth1` - Configure synth voice 1
- `synth2` - Configure synth voice 2
- `synth3` - Configure synth voice 3
- `synth4` - Configure synth voice 4
- `synth5` - Configure bgplay synth (voices 4-8)

### Effects (Multi-voice, applies to #play)

- `echo` - Apply echo effect to voices 0-1
- `fcrush` - Apply frequency crush to voices 0-1
- `autofilter` - Apply autofilter to voices 0-1
- `reverb` - Apply reverb to voices 0-1
- `distort` - Apply distortion to voices 0-1
- `vibrato` - Apply vibrato to voices 0-1
- `autowah` - Apply autowah to voices 0-1

### Individual Voice Effects

- `echo1`, `echo2`, `echo3` - Echo for voices 0, 1, 2
- `fcrush1`, `fcrush2`, `fcrush3` - Frequency crush for voices 0, 1, 2
- `autofilter1`, `autofilter2`, `autofilter3` - Autofilter for voices 0, 1, 2
- `reverb1`, `reverb2`, `reverb3` - Reverb for voices 0, 1, 2
- `distort1`, `distort2`, `distort3` - Distortion for voices 0, 1, 2
- `vibrato1`, `vibrato2`, `vibrato3` - Vibrato for voices 0, 1, 2
- `autowah1`, `autowah2`, `autowah3` - Autowah for voices 0, 1, 2

---

## element.ts (ELEMENT_FIRMWARE)

**Total: 20 commands**

### Variable & State

- `clear` - Clear variables (set to 0)
- `set` - Set variable to value
- `array` - Create array variable
- `read` - Read property from object into variable
- `load` - Load code from object at direction

### Element Transformation

- `become` - Transform element into different kind
- `bind` - Copy code from named element
- `char` - Set character (self or at direction)
- `color` - Set color (self or at direction)

### Movement

- `go` - Move element in direction (returns 0 if moved, 1 if blocked)
- `walk` - Set step direction for element
- `idle` - Yield execution

### Control Flow

- `end` - End program (optionally set 'arg' variable)
- `lock` - Lock chip execution
- `restore` - Restore chip state
- `unlock` - Unlock chip execution
- `zap` - Zap variable
- `cycle` - Set element cycle value (1-255)
- `die` - Delete element (halt execution unless item)

### Execution

- `run` - Run function by name
- `runwith` - Run function with argument

---

## board.ts (BOARD_FIRMWARE)

**Total: 20 commands**

### Board Creation & Navigation

- `build` - Create new board and write id to stat
- `goto` - Teleport player to board by stat
- `transport` - Transport object via transporter elements

### Object Manipulation

- `shove` - Shove target object in direction
- `push` - Push pushable target object in direction
- `duplicate` / `dupe` - Duplicate element at direction
- `duplicatewith` / `dupewith` - Duplicate element with argument
- `write` - Write text to board at direction
- `change` - Change elements of one kind to another
- `put` - Put element at direction
- `putwith` - Put element with argument
- `oneof` - Put element only if mark doesn't exist
- `oneofwith` - Put element with argument only if mark doesn't exist

### Projectiles

- `shoot` - Shoot projectile
- `shootwith` - Shoot projectile with argument
- `throwstar` - Throw star projectile
- `throwstarwith` - Throw star with argument

---

## transforms.ts (TRANSFORM_FIRMWARE)

**Total: 6 commands**

- `snapshot` - Create board snapshot
- `revert` - Revert board to snapshot
- `copy` - Copy board region from source to current board
- `remix` - Remix board with pattern size and mirror
- `weave` - Weave board pattern in direction
- `pivot` - Rotate board region by degrees

---

## runtime.ts (RUNTIME_FIRMWARE)

**Total: 7 commands**

- `endgame` - Set health to 0
- `shortsend` - Send message to elements
- `send` - Send message to elements (with full parsing)
- `stat` - No-op
- `text` - Display text in gadget
- `hyperlink` - Create hyperlink in gadget
- `help` - Show reference scroll

---

## display.ts (DISPLAY_FIRMWARE)

**Total: 2 commands**

- `toast` - Show toast notification
- `ticker` - Set element ticker text and log

---

## loader.ts (LOADER_FIRMWARE)

**Total: 12 commands**

### Basic Commands (No-op or simplified versions)

- `endgame` - No-op in loaders
- `shortsend` - Send message to elements
- `send` - Send message to elements
- `stat` - No-op
- `text` - Chat text
- `hyperlink` - Chat hyperlink

### Loading

- `readline` - Load text line by line
- `readjson` - Load JSON data
- `readbin` - Load binary data

### Context Switching

- `withboard` - Switch READ_CONTEXT to target board
- `withobject` - Switch READ_CONTEXT to target object
- `userinput` - Handle user input actions (up/down/left/right/etc)

---

## network.ts (NETWORK_FIRMWARE)

**Total: 2 commands**

- `fetch` - Fetch URL with label, method, and optional data
- `fetchwith` - Fetch URL with argument, label, method, and optional data

---

## Summary Statistics

- **Total unique commands across all firmware files: ~143**
- **Files with most commands:**
  1. cli.ts - 50 commands
  2. audio.ts - 42 commands
  3. element.ts - 20 commands
  4. board.ts - 20 commands
  5. loader.ts - 12 commands
  6. runtime.ts - 7 commands
  7. transforms.ts - 6 commands
  8. network.ts - 2 commands
  9. display.ts - 2 commands

Note: Some commands appear in multiple firmware files (e.g., `endgame`, `shortsend`, `send`, `stat`, `text`, `hyperlink`) with different implementations for different contexts.
