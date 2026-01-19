# Device Module - Exported Functions

This document categorizes and summarizes all exported functions from the `device` module.

## Table of Contents
1. [API & Messaging](#api--messaging)
2. [Virtual Machine (VM)](#virtual-machine-vm)
3. [Register Device](#register-device)
4. [Audio & Synthesis](#audio--synthesis)
5. [Bridge & Networking](#bridge--networking)
6. [Gadget Client/Server](#gadget-clientserver)
7. [Message Forwarding](#message-forwarding)
8. [Modem (Shared State)](#modem-shared-state)
9. [Session & Lifecycle](#session--lifecycle)
10. [Types & Utilities](#types--utilities)

---

## API & Messaging

**File:** `api.ts`

Core messaging API for communicating with devices. These functions provide a clean interface to send messages without directly accessing device internals.

### Core Types
- `DEVICELIKE` - Interface for devices that can emit messages
- `MESSAGE` - Message structure with session, player, id, sender, target, and optional data
- `ismessage(value)` - Type guard to check if a value is a MESSAGE

### Session Management
- `sessionreset(device)` - Reset device session

### Logging & Communication
- `apierror(device, player, kind, ...message)` - Log error messages
- `apilog(device, player, ...message)` - Log informational messages
- `apichat(device, board, ...message)` - Send chat messages to a board
- `apitoast(device, player, toast)` - Display toast notification

### Platform
- `platformready(device)` - Signal that platform is ready

---

## Virtual Machine (VM)

**File:** `vm.ts`

Core virtual machine operations for managing game state, memory, code execution, and player interactions.

### Lifecycle
- `started()` - Signal that VM has started

### VM Control (via api.ts)
- `vmoperator(device, player)` - Set operator for VM
- `vmadmin(device, player)` - Open admin menu
- `vmhalt(device, player)` - Toggle halt/dev mode
- `vmrestart(device, player)` - Restart all chips and flags
- `vmflush(device, player)` - Save state to URL
- `vmclearscroll(device, player)` - Clear scroll locks for player

### Memory & Books
- `vmbooks(device, player, books)` - Load compressed books into VM
- `vmloader(device, player, arg, format, idoreventname, content)` - Load content in various formats (file/text/json/binary)
- `vmpublish(device, player, target, ...args)` - Publish memory to external service

### Player Management
- `vmlogin(device, player, storage)` - Login player with storage data
- `vmlocal(device, player)` - Login player locally (no storage)
- `vmlogout(device, player, isendgame)` - Logout player
- `vmdoot(device, player)` - Send keepalive signal
- `vmsearch(device, player)` - Search for player

### Input & CLI
- `vminput(device, player, input, mods)` - Send input to VM
- `vmcli(device, player, input)` - Execute CLI command
- `vmclirepeatlast(device, player)` - Repeat last CLI command

### Code Management
- `vmcodeaddress(book, path)` - Generate code address from book and path
- `vmcodewatch(device, player, book, path)` - Start watching code changes
- `vmcoderelease(device, player, book, path)` - Stop watching code changes

### Content & Discovery
- `vmzztsearch(device, player, field, text)` - Search Museum of ZZT
- `vmzztrandom(device, player)` - Get random ZZT games
- `vmzsswords(device, player)` - Get ZSS word definitions
- `vmtopic(device, player, topic)` - Set topic
- `vmrefscroll(device, player)` - Show reference scroll menu
- `vmmakeitscroll(device, player, makeit)` - Create scroll from makeit command
- `vmreadzipfilelist(device, player)` - Read ZIP file list
- `vminspect(device, player, p1, p2)` - Inspect area between two points
- `vmfindany(device, player)` - Open findany menu

### Fork & Transfer
- `vmfork(device, player, transfer)` - Fork state to new window/tab

---

## Register Device

**File:** `register.ts`, `api.ts`

Functions for managing the register device, which handles UI state, terminal, editor, and clipboard operations.

### Player
- `registerreadplayer()` - Get current player ID from session (register.ts)

### Terminal Management
- `registerterminalopen(device, player, openwith?)` - Open terminal with optional initial text
- `registerterminalquickopen(device, player, openwith)` - Quick open terminal in top layout
- `registerterminalclose(device, player)` - Close terminal
- `registerterminaltoggle(device, player)` - Toggle terminal open/closed
- `registerterminalinclayout(device, player, inc)` - Increment/decrement terminal layout
- `registerterminalfull(device, player)` - Open terminal in full layout

### Editor Management
- `registereditoropen(device, player, book, path, type, title)` - Open code editor
- `registereditorclose(device, player)` - Close code editor

### Clipboard & Files
- `registercopy(device, player, content)` - Copy text to clipboard
- `registerdownloadjsonfile(device, player, data, filename)` - Download JSON file

### Memory Operations
- `registersavemem(device, player, historylabel, compressedbooks, books)` - Save memory state
- `registerforkmem(device, player, books, transfer)` - Fork memory to new window
- `registerpublishmem(device, player, books, ...args)` - Publish memory (itch.io, BBS, etc.)

### Developer Tools
- `registerdev(device, player)` - Enable dev mode
- `registerinspector(device, player, forcevalue?)` - Toggle inspector mode
- `registerfindany(device, player, pts)` - Set findany points
- `registershare(device, player)` - Share current state
- `registernuke(device, player)` - Reset application (nuke)

### Input
- `registerinput(device, player, input, shift)` - Register input event

### Login
- `registerloginready(device, player)` - Signal login ready state
- `registerloginfail(device, player)` - Signal login failure

### Storage
- `registerstore(device, player, name, value)` - Store value in IndexedDB

---

## Audio & Synthesis

**File:** `synth.ts` (via api.ts)

Functions for audio synthesis, playback, TTS, and voice configuration.

### Audio Control
- `enableaudio()` - Enable audio system (initializes Tone.js context)
- `synthaudioenabled(device, player)` - Signal that audio is enabled
- `synthrestart(device, player)` - Restart audio system
- `synthflush(device, player)` - Flush audio buffers

### Audio Buffers
- `synthaudiobuffer(device, player, audiobuffer)` - Add audio buffer to synth

### Playback
- `synthplay(device, player, board, buffer)` - Play audio buffer on board
- `synthbgplay(device, player, board, buffer, quantize)` - Play background audio
- `synthbpm(device, player, bpm)` - Set BPM
- `synthplayvolume(device, player, volume)` - Set playback volume
- `synthbgplayvolume(device, player, volume)` - Set background volume

### Text-to-Speech (TTS)
- `synthtts(device, player, board, voice, phrase)` - Play TTS immediately
- `synthttsqueue(device, player, board, voice, phrase)` - Queue TTS for playback
- `synthttsclearqueue(device, player)` - Clear TTS queue
- `synthttsvolume(device, player, volume)` - Set TTS volume
- `synthttsengine(device, player, engine, config)` - Set TTS engine and config
- `synthttsinfo(device, player, info)` - Send TTS info string to synth

### Heavy (TTS worker)
- `heavyttsinfo(device, player, engine, info)` - Send TTS info to heavy worker
- `heavyttsrequest(device, player, engine, config, voice, phrase)` - Request TTS from heavy worker

### Voice Configuration
- `synthvoice(device, player, idx, config, value)` - Configure synth voice
- `synthvoicefx(device, player, idx, fx, config, value)` - Configure voice effects

### Recording
- `synthrecord(device, player, filename)` - Start/stop audio recording

### Broadcast
- `synthbroadcastdestination()` - Get MediaStreamAudioDestinationNode for broadcasting

---

## Bridge & Networking

**File:** `bridge.ts` (via api.ts)

Functions for network operations, streaming, and external service integration.

### Network Fetch
- `bridgefetch(device, player, arg, label, url, method, words)` - Perform HTTP fetch (GET/POST)

### Streaming
- `bridgestreamstart(device, player, streamkey)` - Start IVS broadcast stream
- `bridgestreamstop(device, player)` - Stop broadcast stream

### Chat Integration
- `bridgechatstart(device, player, channel)` - Start Twitch chat connection
- `bridgechatstop(device, player)` - Stop Twitch chat connection

### Peer Connection
- `bridgestart(device, player, hidden)` - Start peer server
- `bridgetab(device, player, hidden)` - Open join tab
- `bridgetabopen(device, player)` - Open join URL in new tab
- `bridgejoin(device, player, topic)` - Join peer connection
- `bridgeshowjoincode(device, player, hidden)` - Show join code/URL

---

## Gadget Client/Server

**File:** `gadgetserver.ts`, `gadgetclient.ts` (via api.ts)

Functions for managing gadget (UI) state synchronization between server and client.

### Server Operations
- `gadgetserverdesync(device, player)` - Force desync and full state refresh
- `gadgetserverclearscroll(device, player)` - Clear scroll on server

### Client Operations
- `gadgetclientpaint(device, player, json)` - Paint full gadget state (desync)
- `gadgetclientpatch(device, player, json)` - Apply incremental patch to gadget state

---

## Message Forwarding

**File:** `forward.ts`

Functions for managing message forwarding between peers, server, client, and heavy worker.

### Forward Creation
- `createforward(handler)` - Create forward device with message handler

### Forwarding Rules
- `shouldnotforwardonpeerserver(message)` - Check if message should NOT forward on peer server
- `shouldforwardservertoclient(message)` - Check if message should forward server→client
- `shouldnotforwardonpeerclient(message)` - Check if message should NOT forward on peer client
- `shouldforwardclienttoserver(message)` - Check if message should forward client→server
- `shouldforwardclienttoheavy(message)` - Check if message should forward client→heavy
- `shouldforwardheavytoclient(message)` - Check if message should forward heavy→client

---

## Modem (Shared State)

**File:** `modem.ts`

Functions for shared state synchronization using Yjs (CRDT).

### React Hooks
- `useWaitForValueNumber(key)` - React hook to wait for number value
- `useWaitForValueString(key)` - React hook to wait for string value

### Value Initialization
- `modemwriteinitnumber(key, value)` - Initialize number value in shared state
- `modemwriteinitstring(key, value)` - Initialize string value in shared state

### Value Writing
- `modemwritevaluenumber(key, value)` - Write number value to shared state
- `modemwritevaluestring(key, value)` - Write string value to shared state

### Value Observation
- `modemobservevaluenumber(key, callback)` - Observe number value changes
- `modemobservevaluestring(key, callback)` - Observe string value changes

### Exports
- `Y` - Yjs library export
- `MODEM_SHARED_TYPE` - Enum for shared type (NUMBER, STRING)

---

## Session & Lifecycle

**File:** `session.ts`, `stub.ts`, `vm.ts`

Functions for session management and device lifecycle.

### Session
- `SOFTWARE` - Singleton device instance for current session

### Lifecycle
- `started()` - Signal device has started (from vm.ts or stub.ts)

---

## Types & Utilities

**File:** `api.ts`

### Reader Types
- `TEXT_READER` - Structure for reading text files
- `JSON_READER` - Structure for reading JSON files
- `BINARY_READER` - Structure for reading binary files

### Reader Creators
- `createbinaryreader(filename, content)` - Create binary reader from Uint8Array

---

## Summary Statistics

- **Total Exported Functions:** ~127
- **API Functions:** ~80 (messaging helpers)
- **Device-Specific Functions:** ~47 (direct device operations)
- **Types & Interfaces:** ~10

### By Category
1. **API & Messaging:** ~80 functions
2. **VM Operations:** ~30 functions
3. **Register Operations:** ~20 functions
4. **Audio/Synth/Heavy:** ~18 functions
5. **Bridge/Networking:** ~10 functions
6. **Modem/Shared State:** ~8 functions
7. **Gadget:** ~4 functions
8. **Forwarding:** ~7 functions
9. **Lifecycle:** ~2 functions

---

## Notes

- Most functions follow the pattern: `device.emit(player, target, data)`
- Functions in `api.ts` are convenience wrappers around device messaging
- Device-specific functions (like in `vm.ts`, `register.ts`) handle message routing internally
- The system uses a message-passing architecture with devices as message handlers
- Session management ensures messages are scoped to the correct session
- Player filtering ensures messages are routed to the correct player

