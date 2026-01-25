# Feature Module - Exported Functions

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

**File:** `writeui.ts`

Helper functions for writing formatted log lines to the terminal with various UI elements.

### Constants
- `DIVIDER` - Pre-formatted divider string constant

### Basic Writing
- `write(device, player, text)` - Write text to terminal log
- `writetext(device, player, text)` - Write colored text to terminal

### Structured UI Elements
- `writeheader(device, player, header)` - Write a formatted header with top and bottom bars
- `writesection(device, player, section)` - Write a section separator
- `writeoption(device, player, option, label)` - Write an option with label
- `writetbar(device, player, width)` - Write top bar of specified width
- `writebbar(device, player, width)` - Write bottom bar of specified width

### Interactive Elements
- `writehyperlink(device, player, hyperlink, label)` - Write a hyperlink with label
- `writecopyit(device, player, content, label, showqr?)` - Write copyable content with optional QR code
- `writeopenit(device, player, content, label)` - Write openable content link
- `writeqr(device, player, content)` - Write QR code as ASCII art

---

## Text-to-Speech (TTS)

**Files:** `tts.ts`, `heavy/tts.ts`

Text-to-speech functionality with support for multiple engines (Edge, Piper, Kitten).

### Engine Configuration
- `selectttsengine(engine, config)` - Select TTS engine ('edge' | 'piper' | 'kitten') with config

### Audio Generation
- `requestaudiobuffer(player, voice, input)` - Request audio buffer for text (Edge TTS)
- `requestaudiobytes(player, engine, config, voice, input)` - Request audio bytes (Piper/Kitten TTS)
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

**Files:** `parse/file.ts`, `parse/ansi.ts`, `parse/chr.ts`, `parse/zzt.ts`, `parse/zzm.ts`, `parse/zztobj.ts`, `parse/ansilove/index.ts`, `parse/markdownscroll.ts`, `parse/markdownwriteui.ts`

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
- `parsemarkdownforscroll(player, content)` - Parse markdown for scroll display
- `parsemarkdownforwriteui(player, content)` - Parse markdown for writeui display

---

## Audio Synthesis

**Files:** `synth/index.ts`, `synth/fx.ts`, `synth/source.ts`, `synth/drums.ts`, `synth/playnotation.ts`, `synth/voiceconfig.ts`, `synth/voicefx*.ts`, `synth/mp3.ts`, `synth/fcrushworkletnode.ts`, `synth/sidechainworkletnode.ts`

Audio synthesis system with support for multiple sound sources, effects, and playback modes.

### Initialization
- `setupsynth()` - Initialize synth audio worklet modules
- `createsynth()` - Create audio synth instance with all sources, effects, and routing

### Types
- `AUDIO_SYNTH` - Type for synth instance returned by createsynth
- `SOURCE_TYPE` - Enum of source types (SYNTH, ALGO_SYNTH, BELLS, RETRO_NOISE, etc.)
- `SOURCE` - Type for audio source configuration
- `SYNTH_OP` - Enum of synth operation codes
- `SYNTH_NOTE` - Type for note values (null | string | number)
- `SYNTH_NOTE_ON` - Type for note-on events
- `SYNTH_NOTE_ENTRY` - Type for timed note entries
- `SYNTH_INVOKE` - Type for synth invocation (operations or play string)

### Effects & Processing
- `createfx()` - Create master FX chain
- `createfxchannels(index)` - Create FX channels for specific source group
- `volumetodb(value)` - Convert volume percentage to decibels
- `FrequencyCrusher` - Audio worklet effect class for frequency crushing
- `SidechainCompressor` - Audio worklet effect class for sidechain compression
- `addfcrushmodule()` - Register frequency crusher audio worklet
- `addsidechainmodule()` - Register sidechain compressor audio worklet

### Voice Configuration
- `synthvoiceconfig(...)` - Configure synth voice parameters
- `synthvoicefxconfig(...)` - Configure voice FX parameters
- `synthvoicefxautofilterconfig(...)` - Configure autofilter effect
- `synthvoicefxautowahconfig(...)` - Configure autowah effect
- `synthvoicefxdistortionconfig(...)` - Configure distortion effect
- `synthvoicefxechoconfig(...)` - Configure echo effect
- `synthvoicefxfcrushconfig(...)` - Configure frequency crusher effect
- `synthvoicefxreverbconfig(...)` - Configure reverb effect
- `synthvoicefxvibratoconfig(...)` - Configure vibrato effect

### Source Creation
- `createsource(sourcetype, algo)` - Create audio source of specified type and algorithm
- `AlgoSynth` - Algorithmic synthesis class
- `createsynthdrums(drumvolume, drumaction)` - Create drum kit with volume controls

### Playback & Notation
- `invokeplay(idx, starttime, invoke, withendofpattern?)` - Convert synth invocation to timed note entries
- `parseplay(play)` - Parse play notation string to synth invocations
- `converttomp3(audiobuffer)` - Convert audio buffer to MP3 format

### Constants
- `SYNTH_SFX_RESET` - Constant for SFX channel reset index

---

## External APIs & URLs

**File:** `url.ts`

Functions for interacting with external services (Bytes, Bridge, BBS).

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

### BBS Integration
- `bbslogin(email, tag)` - Login to BBS with email and tag
- `bbslogincode(email, code)` - Login to BBS with email and code
- `bbslist(email, code)` - List BBS posts
- `bbspublish(email, code, filename, url, tags)` - Publish to BBS
- `bbsdelete(email, code, filename)` - Delete from BBS

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
- `romparse(content, handler)` - Parse ROM content line by line with handler
- `romprint(player, line)` - Print ROM line to terminal using writeui functions
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

**Files:** `keyboard.ts`, `speechtotext.ts`, `fetchwiki.ts`, `storage.ts`

Various utility functions for browser APIs and external services.

### Clipboard
- `withclipboard()` - Get browser Clipboard API instance

### Speech Recognition
- `SpeechToText` - Class for browser speech recognition with callbacks for final text, interim results, and end events
  - `startListening()` - Start speech recognition
  - `stopListening()` - Stop speech recognition

### Wiki
- `fetchwiki(pagepath)` - Fetch markdown content from GitHub wiki

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

**Files:** `heavy/tts.ts`, `heavy/pipertts.ts`, `heavy/kittentts.ts`, `heavy/utils.ts`, `heavy/textcleaner.ts`, `heavy/modelcache.ts`

Heavy processing functions for TTS engines that run in workers or use heavy computations.

### TTS Functions
- `requestinfo(player, engine, info)` - Request TTS engine information (e.g., list of available voices)
- `requestaudiobytes(player, engine, config, voice, input)` - Request audio bytes from TTS engine

### TTS Classes
- `PiperTTS` - Piper TTS engine class
- `KittenTTS` - Kitten TTS engine class

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

