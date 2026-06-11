# Feature Module - Exported Functions

<!-- When public exports under `zss/feature/` change, update this catalog. -->

This document categorizes and summarizes all exported functions from the `feature` module.

## Table of Contents
1. [UI Writing & Display](#ui-writing--display)
2. [Text-to-Speech (TTS)](#text-to-speech-tts)
3. [Network Terminal](#network-terminal)
4. [Data Formatting & Serialization](#data-formatting--serialization)
5. [Board Operations](#board-operations)
6. [File Parsing](#file-parsing)
7. [Audio Synthesis](#audio-synthesis)
8. [External APIs & URLs](#external-apis--urls)
9. [Bytes & Assets](#bytes--assets)
10. [ROM & Help System](#rom--help-system)
11. [Publishing](#publishing)
12. [Utilities](#utilities)

---

## UI Writing & Display

**Files:** `writeui.ts`, `zsstextui.ts`

**`zsstextui.ts`** — Pure layout line strings: `layoutheaderlines`, `layoutsectionlines`, `layouttbarline`, `layoutbbarline`, `layoutoptionline`, `layouttextline`; constants `DIVIDER`, `DOWN_SPOUT`, `UP_SPOUT`. Callers combine with `write` or `gadgettext`.

**`writeui.ts`** — Terminal sinks: `write`, `writehyperlink`, `writerunit`, `writeqr`, `writecopyit`, `writeopenit`.

---

## Text-to-Speech (TTS)

**Files:** `tts.ts`, `heavy/tts.ts`

Text-to-speech functionality with support for multiple engines (Edge, Piper, Supertonic).

### Engine Configuration
- `selectttsengine(engine, config)` - Select TTS engine ('edge' | 'piper' | 'supertonic') with config

### Audio Generation
- `requestaudiobuffer(player, voice, input)` - Request audio buffer for text (Edge TTS)
- `requestaudiobytes(player, engine, config, voice, input)` - Request audio bytes (Piper/Supertonic TTS)
- `requestinfo(player, engine, info)` - Request TTS engine information (e.g., list of available voices)

### Playback
- `ttsplay(player, voice, input)` - Play text as speech immediately
- `ttsqueue(player, voice, input)` - Queue text for speech playback
- `ttsclearqueue()` - Clear TTS playback queue

---

## Network Terminal

**File:** `netterminal.ts`

Peer-to-peer networking functionality for terminal connections using PeerJS.

### Topic Management
- `readsubscribetopic()` - Read current subscribed topic

### Connection Management
- `netterminalhost()` - Host a new network terminal session
- `netterminaljoin(topicpeerid)` - Join an existing network terminal session
- `netterminalhalt()` - Halt and disconnect from network terminal

---

## Data Formatting & Serialization

**File:** `format.ts`

Functions for formatting and serializing objects using msgpack.

### Types
- `FORMAT_OBJECT` - Tuple type for formatted object data
- `FORMAT_METHOD` - Type for formatting transformation functions

### Formatting
- `FORMAT_SKIP()` - Return null to skip field during formatting
- `formatobject(obj, keymap, formatmap?)` - Format object with key mapping and transformation
- `unformatobject<T>(formatted, keymap, formatmap?)` - Reverse formatobject, reconstructing original object

### Serialization
- `packformat(entry)` - Pack FORMAT_OBJECT to Uint8Array using msgpack
- `unpackformat(content)` - Unpack Uint8Array or JSON string to FORMAT_OBJECT

---

## Board Operations

**Files:** `boardcopy.ts`, `boardweave.ts`, `boardremix.ts`, `boardsnapshot.ts`, `boardpivot.ts`

Functions for manipulating board elements, terrain, and objects.

### Copying
- `boardcopy(source, target, p1, p2, targetset)` - Copy board region (supports 'all', 'object', 'terrain', or group name)
- `boardcopygroup(source, target, p1, self, targetgroup)` - Copy board elements by group
- `mapelementcopy(maybenew, from)` - Copy element properties from one element to another

### Transformation
- `boardweave(target, delta, p1, p2, self, targetset)` - Shift/wrap board region by delta (supports 'all', 'object', 'terrain', or group name)
- `boardweavegroup(target, delta, self, targetgroup)` - Shift board elements by group with collision detection
- `boardpivot(target, theta, p1, p2, targetset)` - Rotate board region using shear transforms (supports 'all', 'object', 'terrain')

### Procedural Generation
- `boardremix(target, source, patternsize, mirror, p1, p2, targetset)` - Generate board region using wavefunction collapse algorithm

### Snapshot & Restore
- `boardsnapshot(target)` - Create snapshot of board state
- `boardrevert(target)` - Revert board to last snapshot

---

## File Parsing

**Files:** `parse/file.ts`, `parse/ansi.ts`, `parse/chr.ts`, `parse/zzt.ts`, `parse/zzm.ts`, `parse/zztobj.ts`, `parse/ansilove/index.ts`, `parse/markdownscroll.ts`, `parse/markdownterminal.ts`

Functions for parsing various file formats and converting them to internal representations.

### File Type Detection
- `mimetypeofbytesread(filename, filebytes)` - Detect MIME type from file bytes
- `mapfiletype(type, file)` - Map MIME type to internal file type string

### ZIP Archive Handling
- `parsezipfile(player, file)` - Parse ZIP file and extract file list
- `readzipfilelist()` - Read list of files from parsed ZIP
- `markzipfilelistitem(filename, value)` - Mark ZIP file item for processing
- `readzipfilelistitem(filename)` - Check if ZIP file item is marked
- `parsezipfilelist(player)` - Parse all marked files from ZIP archive
- `parsebinaryfile(file, player, onbuffer)` - Parse binary file and pass buffer to callback

### Web File Parsing
- `parsewebfile(player, file)` - Parse web file based on type (dispatches to appropriate parser)

### Format-Specific Parsers
- `parseansi(player, filename, filetype, filebytes)` - Parse ANSI/art files (ans, adf, bin, idf, pcb, tnd, xb, diz)
- `parsechr(player, filename, filebytes)` - Parse CHR (character set) files
- `parsezzt(player, content)` - Parse ZZT world files
- `parsebrd(player, content)` - Parse BRD (board) files
- `parsezzm(player, content)` - Parse ZZM (music) files
- `parsezztobj(player, filename, content)` - Parse OBJ (object model) files
- `zztoop(content)` - Parse ZZT OOP (Object Oriented Programming) code

### ANSI Art Rendering
- `renderBytes(bytes, callback, options?, callbackFail?)` - Render ANSI art bytes to display data
- `splitRenderBytes(bytes, callback, splitRows?, options?, callbackFail?)` - Render ANSI art with row splitting
- `sauceBytes(bytes)` - Extract SAUCE metadata from bytes

### Markdown Parsing
- `scrollwritemarkdownlines(player, content, scrollname, chip?)` - Parse markdown for scroll display; optional `chip` (default `refscroll`) passed to `scrollwritelines`
- `terminalwritemarkdownlines(player, content)` - Parse markdown for terminal log; batches through `terminalwritelines` on `SOFTWARE`

---

## Audio Synthesis

**Files:** `synth/index.ts`, `synth/frontend/synthbackend.ts`, `synth/backend/daisy/*`, `synth/backend/wasm/*`, `synth/playnotation.ts`, `synth/synthdefaults.ts`, `synth/voicefxgroup.ts`, `synth/mp3.ts`

DaisySP WASM backend with engine-agnostic front-end (`SynthBackend` interface). Legacy Tone.js and Maximilian code are under `synth/archive/`.

### Initialization
- `createsynthbackend()` - Boot DaisySP synth and return a `SynthBackend` adapter
- `bootdaisysynth()` - Load Daisy WASM and create synth instance
- `enableaudio()` (device layer) - User-gesture audio init

### Types
- `SynthBackend` - Back-end interface (play, voices, FX, record, broadcast)
- `FXNAME` - Voice FX name union
- `SOURCE_TYPE` - Enum of source types (SYNTH, ALGO_SYNTH, BELLS, RETRO_NOISE, etc.)
- `DAISY_SYNTH` - Daisy synth instance type
- `SYNTH_INVOKE`, `SYNTH_NOTE_ENTRY`, `SYNTH_NOTE_ON` - Play notation types

### Board state
- `applyboardstate(backend, synthstate)` - Sync gadget `SYNTH_STATE` to backend

### Playback & Notation
- `invokeplay(...)` - Convert synth invocation to timed note entries
- `parseplay(play)` - Parse play notation string to synth invocations
- `converttomp3(audiobuffer)` - Convert `AudioBuffer` to MP3 format

### Constants
- `SYNTH_SFX_RESET` - Constant for SFX channel reset index
- `SYNTH_VOICE_COUNT`, `SYNTH_PLAY_VOICE_COUNT`, `SYNTH_DEFAULT_WAVE` - Voice defaults

### Shared WASM helpers
- `unlockaudiocontext()` - Create/resume shared `AudioContext` on user gesture
- `ensurewasmcoep()` - Register COOP/COEP service worker for SharedArrayBuffer

---

## External APIs & URLs

**File:** `url.ts`

Functions for interacting with external services (Bytes, Bridge, ZNS).

### URL Shortening
- `shorturl(url)` - Create short URL via bytes.zed.cafe service
- `isjoin()` - Check if running in join mode based on URL

### Museum of ZZT Integration
- `museumofzztsearch(field, text, offset)` - Search Museum of ZZT files
- `museumofzztrandom()` - Get random file from Museum of ZZT
- `museumofzztscreenshoturl(content)` - Get screenshot URL for content
- `museumofzztdownload(player, content)` - Download ZZT file from Museum of ZZT

### Types
- `MOSTLY_ZZT_META` - Type for ZZT file metadata

### ZNS (namespace string sharing)
- `znslogin(email, namespace)` - Start ZNS email OTP login
- `znslogincode(email, code)` - Confirm OTP; response includes `token`
- `znslist(email, token)` - List namespace key/value pairs
- `znsset(email, token, key, value)` - Set pair (peer id at key `peer`, bytes hash, or text)
- `znsdelete(email, token, key)` - Delete a pair key
- `fetchznstext(namespace, key)` - GET `https://{namespace}.at.zed.cafe/{key}` markdown
- `znstenanturl(namespace, key)` - Canonical tenant URL (lowercase host)
- `znsnormalizenamespace(namespace)` - Trim + lowercase namespace label
- `znsnormalizepathkey(name)` - Slug for ZNS path keys
- `znskeyispeer(key, kind?)` - True for reserved peer key
- `znskinddisplay(kind?, key?)` - Worker kind to menu label (`text` → `code`)
- `znskeyopenlabel(key, value, kind?)` - `#zns` menu key row label
- `znskeylinkcommand(namespace, key, value, kind?)` - Menu hyperlink payload
- `znsautopublishpeer(peerid, player)` - Publish peer id on multiplayer connect
- `znspersistlogin` / `znspersistlogout` - IDB ZNS session

---

## Bytes & Assets

**Files:** `bytes.ts`, `palette.ts`, `charset.ts`

Functions for loading and manipulating binary assets (palettes, character sets).

### Palette
- `PALETTE` - Default color palette (hex array)
- `loadpalettefrombytes(bytes)` - Load palette bitmap from byte array

### Character Set
- `CHARSET` - Default character set (hex array)
- `loadcharsetfrombytes(bytes)` - Load character set bitmap from byte array
- `writecharfrombytes(bytes, charset, idx)` - Write character data to charset bitmap
- `readcharfrombytes(charset, idx)` - Read character data from charset bitmap

---

## ROM & Help System

**File:** `rom/index.ts`

Read-only memory system for help text and documentation.

### ROM Access
- `romread(address)` - Read ROM content by address (returns help text or undefined)
- `romhintfrommarkdown(content)` - Extract `hint:` from editor ROM markdown (or legacy `desc;` line)
- `romparse(content, handler)` - Parse ROM content line by line with handler
- `romprint(player, line)` - Print ROM line to terminal using zsstextui layout + write
- `romscroll(player, line)` - Print ROM line to scroll using gadget functions
- `romintolookup(content)` - Convert ROM content to key-value lookup object

### Types
- `ROM_LOOKUP` - Type for ROM lookup dictionary

---

## Publishing

**File:** `itchiopublish.ts`

Functions for exporting and publishing content.

### Publishing
- `itchiopublish(filename, exportedbooks)` - Create ZIP file with HTML redirect for itch.io publishing

---

## Utilities

**Files:** `keyboard.ts`, `speechtotext.ts`, `fetchrefscrolltext.ts`, `storage.ts`

Various utility functions for browser APIs and external services.

### Clipboard
- `withclipboard()` - Get browser Clipboard API instance

### Speech Recognition
- `SpeechToText` - Class for browser speech recognition (sttspace worker); final text after speech pause, optional status toasts
  - `startListening()` - Start speech recognition
  - `stopListening()` - Stop speech recognition

### Refscroll / ZNS docs
- `fetchrefscrolltext(pagepath)` - ROM `refscroll:*` then `docs.at.zed.cafe` text
- `fetchznstext(namespace, key)` - Public ZNS markdown GET (`{namespace}.at.zed.cafe`)

### Storage
- `storagereadconfigdefault(name)` - Read default configuration value for a setting
- `storagereadconfig(name)` - Read configuration value from storage (async)
- `storagewriteconfig(name, value)` - Write configuration value to storage (async)
- `storagereadconfigall()` - Read all configuration values from storage (async)
- `storagereadhistorybuffer()` - Read command history buffer from storage (async)
- `storagewritehistorybuffer(historybuffer)` - Write command history buffer to storage (async)
- `storagereadcontent(filename)` - Read content file from storage (async)
- `storagewritecontent(filename, content)` - Write content file to storage (async)
- `storagereadvars()` - Read variables from storage (async)
- `storagewritevar(name, value)` - Write variable to storage (async)
- `storagewatchcontent(player)` - Watch content file changes (async)
- `storagesharecontent(player)` - Share content file (async)
- `storagenukecontent(player)` - Delete all content files (nuke)

---

## Heavy Processing Module

**Files:** `heavy/tts.ts`, `heavy/pipertts.ts`, `heavy/supertonictts.ts`, `heavy/utils.ts`, `heavy/textcleaner.ts`, `heavy/modelcache.ts`

Heavy processing functions for TTS engines that run in workers or use heavy computations.

### TTS Functions
- `requestinfo(player, engine, info)` - Request TTS engine information (e.g., list of available voices)
- `requestaudiobytes(player, engine, config, voice, input)` - Request audio bytes from TTS engine

### TTS Classes
- `PiperTTS` - Piper TTS engine class
- `SupertonicTTS` - Supertonic TTS engine class (Supertonic-TTS-2-ONNX)

### Utilities
- `detectWebGPU()` - Detect WebGPU support
- `TextSplitterStream` - Stream class for splitting text into chunks
- `RawAudio` - Class for handling raw audio data with encoding/decoding
- `normalizePeak(f32, target?)` - Normalize audio peak level
- `trimSilence(...)` - Trim silence from audio
- `cleanTextForTTS(text)` - Clean text for TTS processing
- `chunkText(text)` - Chunk text for processing
- `cachedFetch(url)` - Fetch with caching support
- `ModelCache` - Model caching utility class

### Phonemizer (JavaScript)
- `list_voices(language)` - List available voices for language
- `phonemize(text, language?)` - Convert text to phonemes

---

## Parse Submodule - ANSI Art Library

**Files:** `parse/ansilove/*`

Complete ANSI art parsing library with support for multiple formats.

### Main Functions
- `renderBytes(bytes, callback, options?, callbackFail?)` - Main render function
- `splitRenderBytes(bytes, callback, splitRows?, options?, callbackFail?)` - Render with row splitting
- `sauceBytes(bytes)` - Extract SAUCE metadata

### Internal Modules
- `ParserModule` - Core parsing functionality
- `FontModule` - Font rendering
- `PaletteModule` - Palette handling
- `File` - File object representation
- `ScreenData` - Screen data class

### Types
- `Sauce` - SAUCE metadata type
- `FileObj` - File object type
- `Font` - Font type
- `FontPreset` - Font preset type
- `ScreenData` - Screen data type
- `RenderOptions` - Render options type
- `DisplayData` - Display data type
- `ParsedData` - Parsed data type

