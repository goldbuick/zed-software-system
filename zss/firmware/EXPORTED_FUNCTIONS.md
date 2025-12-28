# Firmware Exported Functions

This document categorizes and summarizes all exported functions from the firmware module.

## Table of Contents
1. [Firmware Modules](#firmware-modules)
2. [Loader Functions](#loader-functions)
3. [Runner Functions](#runner-functions)
4. [Types and Enums](#types-and-enums)

---

## Firmware Modules

Firmware modules are created using `createfirmware()` and export command handlers organized by domain.

### DISPLAY_FIRMWARE (`display.ts`)
**Purpose**: Display and UI feedback commands

| Command | Description |
|---------|-------------|
| `toast` | Display a toast notification message |
| `ticker` | Set ticker text for the current element (sidebar text) |

---

### AUDIO_FIRMWARE (`audio.ts`)
**Purpose**: Audio synthesis, playback, and text-to-speech commands

#### Text-to-Speech
| Command | Description |
|---------|-------------|
| `ttsengine` | Set TTS engine and configuration |
| `tts` | Speak text with voice (or clear queue if no args) |
| `ttsqueue` | Queue TTS text to speak |
| `ttsvol` | Set TTS volume |

#### Playback
| Command | Description |
|---------|-------------|
| `play` | Play audio buffer |
| `bgplay` | Play background audio |
| `bgplayon64n` | Play background audio quantized to 64th note |
| `bgplayon32n` | Play background audio quantized to 32nd note |
| `bgplayon16n` | Play background audio quantized to 16th note |
| `bgplayon8n` | Play background audio quantized to 8th note |
| `bgplayon4n` | Play background audio quantized to quarter note |
| `bgplayon2n` | Play background audio quantized to half note |
| `bgplayon1n` | Play background audio quantized to whole note |
| `vol` | Set playback volume |
| `bgvol` | Set background playback volume |
| `bpm` | Set BPM (beats per minute) |

#### Synthesis
| Command | Description |
|---------|-------------|
| `synth` | Configure synth voices (all 4 voices) or restart if no args |
| `synth1` | Configure synth voice 1 |
| `synth2` | Configure synth voice 2 |
| `synth3` | Configure synth voice 3 |
| `synth4` | Configure synth voice 4 |
| `synth5` | Configure background synth voices (voices 4-8) |
| `synthrecord` | Record synth output to file |
| `synthflush` | Flush synth buffer |

#### Effects (Multi-voice)
| Command | Description |
|---------|-------------|
| `echo` | Apply echo effect to voices 0-1 |
| `fcrush` | Apply bitcrush effect to voices 0-1 |
| `autofilter` | Apply autofilter effect to voices 0-1 |
| `reverb` | Apply reverb effect to voices 0-1 |
| `distort` | Apply distortion effect to voices 0-1 |
| `vibrato` | Apply vibrato effect to voices 0-1 |
| `autowah` | Apply autowah effect to voices 0-1 |

#### Effects (Per-voice)
| Command | Description |
|---------|-------------|
| `echo1`, `echo2`, `echo3` | Apply echo to specific voice |
| `fcrush1`, `fcrush2`, `fcrush3` | Apply bitcrush to specific voice |
| `autofilter1`, `autofilter2`, `autofilter3` | Apply autofilter to specific voice |
| `reverb1`, `reverb2`, `reverb3` | Apply reverb to specific voice |
| `distort1`, `distort2`, `distort3` | Apply distortion to specific voice |
| `vibrato1`, `vibrato2`, `vibrato3` | Apply vibrato to specific voice |
| `autowah1`, `autowah2`, `autowah3` | Apply autowah to specific voice |

---

### NETWORK_FIRMWARE (`network.ts`)
**Purpose**: Network and HTTP request commands

| Command | Description |
|---------|-------------|
| `fetch` | Make HTTP request (GET or POST:JSON) |
| `fetchwith` | Make HTTP request with argument context |

---

### RUNTIME_FIRMWARE (`runtime.ts`)
**Purpose**: Runtime execution, messaging, and UI interaction commands

#### Lifecycle
| Command | Description |
|---------|-------------|
| `endgame` | End game by setting health to 0 |

#### Messaging
| Command | Description |
|---------|-------------|
| `send` | Send message to elements (with parsing) |
| `shortsend` | Send short message to elements (no parsing) |

#### UI
| Command | Description |
|---------|-------------|
| `text` | Set gadget text |
| `hyperlink` | Create hyperlink with label and action |
| `help` | Open reference scroll |
| `stat` | No-op (placeholder) |

**Hooks**:
- `set`: Monitors shared value changes for gadget state
- `aftertick`: Processes ticker queue and scroll updates

---

### LOADER_FIRMWARE (`loader.ts`)
**Purpose**: File loading and parsing commands

#### File Operations
| Command | Description |
|---------|-------------|
| `readline` | Read line from text file |
| `readjson` | Read JSON data using JMESPath query |
| `readbin` | Read binary data with type specification |

#### Context Management
| Command | Description |
|---------|-------------|
| `withboard` | Set board context for element-centric commands |
| `withobject` | Set object context by ID |
| `userinput` | Simulate user input (up, down, left, right, shoot, ok, cancel) |

#### Messaging (Loader-specific)
| Command | Description |
|---------|-------------|
| `send` | Send message to elements |
| `shortsend` | Send short message (with loader fallback) |
| `text` | Output text to chat |
| `hyperlink` | Create chat hyperlink |
| `stat` | No-op |
| `endgame` | No-op (when called in loaders) |

**Hooks**:
- `get`: Provides access to loader metadata (format, filename, cursor, lines, bytes)

---

### ELEMENT_FIRMWARE (`element.ts`)
**Purpose**: Element manipulation, movement, and state management

#### State Management
| Command | Description |
|---------|-------------|
| `set` | Set stat value |
| `clear` | Clear multiple stats (set to 0) |
| `cycle` | Set cycle value (1-255) |

#### Movement
| Command | Description |
|---------|-------------|
| `go` | Move element in direction (returns 0 if moved, 1 if blocked) |
| `walk` | Set walking direction (stepx/stepy) |
| `idle` | Yield execution |

#### Transformation
| Command | Description |
|---------|-------------|
| `become` | Transform element into different kind |
| `bind` | Copy code from named element |
| `char` | Set character (self or at direction) |
| `color` | Set color (self or at direction) |

#### Lifecycle
| Command | Description |
|---------|-------------|
| `die` | Remove element (special handling for items) |
| `end` | End program with optional result |
| `lock` | Lock chip execution |
| `unlock` | Unlock chip execution |
| `restore` | Restore chip state |
| `zap` | Zap chip state |

#### Code Execution
| Command | Description |
|---------|-------------|
| `run` | Run function by name |
| `runwith` | Run function with argument |
| `load` | Load code from object at direction (append or replace) |

#### Data Structures
| Command | Description |
|---------|-------------|
| `array` | Create array from values |
| `read` | Read property from object into stat |

**Hooks**:
- `get`: Reads stats from element, board, player flags, or constants
- `set`: Writes stats to element or player flags
- `everytick`: Handles health checks and walk movement

---

### CLI_FIRMWARE (`cli.ts`)
**Purpose**: Command-line interface and system management commands

#### Messaging
| Command | Description |
|---------|-------------|
| `send` | Send message to elements |
| `shortsend` | Send short message (with loader fallback) |
| `text` | Set ticker text (player) or output to chat |
| `hyperlink` | Create hyperlink with player info |
| `stat` | Make scroll with text |
| `help` | Open reference scroll |

#### Book Management
| Command | Description |
|---------|-------------|
| `books` | List all books |
| `bookrename` | Rename main book |
| `booktrash` | Delete book by address |
| `pages` | List pages in books |
| `pageopen` | Open code editor for page |
| `pagetrash` | Delete page from main book |
| `trash` | Show trash menu (books and pages) |

#### Board Management
| Command | Description |
|---------|-------------|
| `boards` | List all boards |
| `boardopen` | Open board by stat name |

#### Export/Import
| Command | Description |
|---------|-------------|
| `export` | Show export menu |
| `bookexport` | Show book export options |
| `bookallexport` | Export entire book as JSON |
| `pageexport` | Export page as JSON |
| `itchiopublish` | Publish to Itch.io |
| `zztsearch` | Search ZZT worlds |
| `zztrandom` | Get random ZZT world |

#### Game State
| Command | Description |
|---------|-------------|
| `dev` | Enter dev mode (halt execution) |
| `save` | Save game state |
| `share` | Share game |
| `fork` | Fork game to new address |
| `nuke` | Nuke game |
| `endgame` | End game session |
| `restart` | Restart game |

#### Editing Tools
| Command | Description |
|---------|-------------|
| `gadget` | Toggle inspector |
| `findany` | Find elements at points |

#### Multiplayer
| Command | Description |
|---------|-------------|
| `admin` | Open admin panel |
| `joincode` | Start multiplayer session |
| `jointab` | Join multiplayer via tab |

#### Broadcasting
| Command | Description |
|---------|-------------|
| `chat` | Start/stop chat channel |
| `broadcast` | Start/stop stream broadcast |

#### BBS (Bulletin Board System)
| Command | Description |
|---------|-------------|
| `bbs` | BBS operations (login, list, publish, delete, restart) |

---

### BOARD_FIRMWARE (`board.ts`)
**Purpose**: Board-level operations and element placement

#### Board Creation
| Command | Description |
|---------|-------------|
| `build` | Create new board (optionally from source) and write ID to stat |
| `goto` | Teleport player to board by stat name |

#### Element Placement
| Command | Description |
|---------|-------------|
| `put` | Place element at direction |
| `putwith` | Place element with argument |
| `oneof` | Place element only if mark ID doesn't exist |
| `oneofwith` | Place element with argument only if mark ID doesn't exist |
| `shoot` | Shoot bullet in direction |
| `shootwith` | Shoot bullet with argument |
| `throwstar` | Shoot star bullet |
| `throwstarwith` | Shoot star bullet with argument |

#### Element Manipulation
| Command | Description |
|---------|-------------|
| `duplicate` / `dupe` | Duplicate element at direction |
| `duplicatewith` / `dupewith` | Duplicate element with argument |
| `shove` | Move object in direction |
| `push` | Push pushable object in direction |
| `transport` | Transport object using transporter logic |
| `change` | Change all elements of one kind to another kind |
| `write` | Write text on board at direction |

---

### TRANSFORM_FIRMWARE (`transforms.ts`)
**Purpose**: Board transformation and manipulation operations

| Command | Description |
|---------|-------------|
| `snapshot` | Create snapshot of board state |
| `revert` | Revert board to last snapshot |
| `copy` | Copy board region from source board |
| `remix` | Remix board with pattern and mirror settings |
| `weave` | Weave board in direction |
| `pivot` | Rotate board region by degrees |

---

## Loader Functions

Standalone loader command implementations for specific file formats.

### `loadertext` (`loadertext.ts`)
**Purpose**: Text file reading operations

| Operation | Description |
|-----------|-------------|
| `seek <cursor>` | Set cursor position |
| `line` | Advance to next line |
| `<regex> <capture1> <capture2> ...` | Match regex against current line and capture groups |

### `loaderjson` (`loaderjson.ts`)
**Purpose**: JSON file reading operations

| Operation | Description |
|-----------|-------------|
| `<jmespath> <name>` | Query JSON with JMESPath and store result |

### `loaderbinary` (`loaderbinary.ts`)
**Purpose**: Binary file reading operations

| Operation | Description |
|-----------|-------------|
| `seek <cursor>` | Set cursor position |
| `float32` / `float32le` | Read 32-bit float |
| `float64` / `float64le` | Read 64-bit float |
| `int8` / `int8le` | Read 8-bit signed integer |
| `int16` / `int16le` | Read 16-bit signed integer |
| `int32` / `int32le` | Read 32-bit signed integer |
| `int64` / `int64le` | Read 64-bit signed integer |
| `uint8` / `uint8le` | Read 8-bit unsigned integer |
| `uint16` / `uint16le` | Read 16-bit unsigned integer |
| `uint32` / `uint32le` | Read 32-bit unsigned integer |
| `uint64` / `uint64le` | Read 64-bit unsigned integer |
| `text <lengthtype> <target>` | Read text string with length prefix |

---

## Runner Functions

Firmware management and driver functions.

### `firmwarelistcommands(driver: DRIVER_TYPE): string[]`
Lists all available commands for a given driver type.

### `firmwaregetcommand(driver: DRIVER_TYPE, method: string): MAYBE<FIRMWARE_COMMAND>`
Gets a command handler for a driver type and method name.

### `firmwareget(driver: DRIVER_TYPE, chip: CHIP, name: string): [boolean, any]`
Gets a value from firmware (stat access).

### `firmwareset(driver: DRIVER_TYPE, chip: CHIP, name: string, value: any): [boolean, any]`
Sets a value in firmware (stat assignment).

### `firmwareeverytick(driver: DRIVER_TYPE, chip: CHIP)`
Calls everytick hooks for all firmwares in driver.

### `firmwareaftertick(driver: DRIVER_TYPE, chip: CHIP)`
Calls aftertick hooks for all firmwares in driver.

---

## Types and Enums

### `DRIVER_TYPE` (`runner.ts`)
Enumeration of firmware driver types:

- `ERROR` - Error state (no firmwares)
- `CLI` - Command-line interface driver (cli + standardlib)
- `LOADER` - File loading driver (loader + standardlib)
- `RUNTIME` - Runtime execution driver (runtime + standardlib)

**Standard Library Firmwares** (included in CLI, LOADER, RUNTIME):
- `audio`
- `board`
- `display`
- `network`
- `transform`
- `element`

---

## Summary Statistics

- **Total Firmware Modules**: 9
- **Total Commands**: ~150+
- **Loader Functions**: 3
- **Runner Functions**: 6
- **Driver Types**: 4

### Command Distribution by Category

- **Audio**: ~40 commands (TTS, playback, synthesis, effects)
- **Board Operations**: ~15 commands (placement, manipulation, transformation)
- **CLI/System**: ~30 commands (book/page management, export, multiplayer, BBS)
- **Element Operations**: ~20 commands (movement, state, lifecycle)
- **Display/UI**: 2 commands (toast, ticker)
- **Network**: 2 commands (fetch variants)
- **Runtime**: 5 commands (messaging, UI, lifecycle)
- **Loader**: 8 commands (file operations, context management)
- **Transforms**: 6 commands (board transformations)

