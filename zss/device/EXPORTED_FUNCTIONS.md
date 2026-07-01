# Device Module - Exported Functions

<!-- When public exports under `zss/device/` change, update this catalog. -->

This document categorizes and summarizes all exported functions from the `device` module.

## Table of Contents
1. [API & Messaging](#api--messaging)
2. [Virtual Machine (VM)](#virtual-machine-vm)
3. [Register Device](#register-device)
4. [Audio & Synthesis](#audio--synthesis)
5. [Bridge & Networking](#bridge--networking)
6. [Gadget Client](#gadget-client)
7. [Boardrunner](#boardrunner)
8. [Message Forwarding](#message-forwarding)
9. [Modem (Shared State)](#modem-shared-state)
10. [Session & Lifecycle](#session--lifecycle)
11. [Types & Utilities](#types--utilities)

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

### Pilot / Input Plumbing
- `vmpilotstart(device, player, x, y)` - Start pilot at point
- `vmpilotstop(device, player)` - Stop pilot
- `vmpullvarresult(device, player, data)` - Forward a queued read-flag result back to the VM
- `vmlastinputtouch(device, player, targetplayer)` - Refresh "last input" timestamp for a player
- `vmplayermovetoboard(device, player, targetplayer, board, dest)` - Boardrunner asks the sim VM to relocate a player
- `vmgadgetdesync(device, player)` - Ask the sim VM to repaint this player's gadget state

### VM sync (handlers / tick)
- `gadgetsynctick(vm)` - Per-tick gadget projection; emits `gadgetclient:patch` when jsonpipe diff is non-empty ([`vm/gadgetsynctick.ts`](vm/gadgetsynctick.ts))
- `handlegadgetdesync(vm, message)` - Full gadget paint after desync ([`vm/gadgetsynctick.ts`](vm/gadgetsynctick.ts))
- `boardrunnermemorysync(vm)` - Emit memory-root jsonpipe diff to elected boardrunners ([`vm/boardrunnermemorysync.ts`](vm/boardrunnermemorysync.ts))
- `boardrunneremitpatch(device, operations, skipplayer, boundary?)` - Fan-out memory/boundary patch to runners
- `boardrunnermemorypatch(operations)` - Apply remote memory patch on sim worker
- `boardrunnerboundarysync(vm)` - Emit per-boundary jsonpipe diffs to runners ([`vm/boardrunnerboundarysync.ts`](vm/boardrunnerboundarysync.ts))
- `boardrunnerboundarypaint(boundary, doc)` - Full boundary sync + store in memory
- `boardrunnerboundarypatch(boundary, operations)` - Apply remote boundary patch
- `handleclearscroll(vm, message)` - Clear player scroll + unlock board objects ([`vm/handlers/scroll.ts`](vm/handlers/scroll.ts))
- `handlemakeitscroll(vm, message)` - Open make-it scroll
- `handlerefscroll(vm, message)` - ROM refscroll menu
- `handlegadgetscroll(vm, message)` - Generic gadget scroll from payload

### Boardrunner Acks
- `vmboardrunnerack(device, player)` - Boardrunner ack of a `boardrunner:tick`; refreshes ack budget
- `vmboardrunneraccess(device, player, boardid)` - Runner (or firmware on worker) asks sim VM to track `boardid` for the elected board until the board codepage runtime is hydrated; tick/boundary sync include extra ids
- `vmboardrunnerpaint(device, player, doc, boundary)` - Boardrunner sends a full boundary document to authoritative memory (sim jsonpipe reset for that id)

Patch emit helpers (`vmboardrunnerpatch`, `boardrunnerpatch`, `gadgetclientpatch`) live in [`patchapi.ts`](patchapi.ts).

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

**Files:** `register.ts` (thin entry), `register/handlers/registry.ts`, `api.ts`

`register.ts` creates the device and dispatches to handlers under `register/handlers/` (auth, bookmarks, terminal, editor, memory, etc.), matching the `boardrunner/` and `vm/` layout.

Functions for managing the register device, which handles UI state, terminal, editor, and clipboard operations.

### Player
- `registerreadplayer()` - Get current player ID from session (`registerplayer.ts`, re-exported from `register.ts`)
- `registersetmyplayerid(id)` - Set player ID (CLI headless boot)

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
- `registerpublishmem(device, player, books, ...args)` - Publish memory (itch.io, ZNS, etc.)

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
- `synthaudioenabled(device, player, board)` - Signal that audio is enabled
- `synthrestart(device, player, board)` - Restart audio system
- `synthflush(device, player, board)` - Flush audio buffers

### Audio Buffers
- `synthaudiobuffer(device, player, board, audiobuffer)` - Add audio buffer to synth

### Playback
- `synthplay(device, player, board, buffer)` - Play audio buffer on board
- `synthbgplay(device, player, board, buffer, quantize)` - Play background audio
- `synthplayvolume(device, player, board, volume)` - Set playback volume
- `synthbgplayvolume(device, player, board, volume)` - Set background volume

### Text-to-Speech (TTS)
- `synthtts(device, player, board, voice, phrase)` - Play TTS immediately
- `synthttsqueue(device, player, board, voice, phrase)` - Queue TTS for playback
- `synthttsclearqueue(device, player, board)` - Clear TTS queue
- `synthttsvolume(device, player, board, volume)` - Set TTS volume
- `synthttsengine(device, player, board, engine, config)` - Set TTS engine and config
- `synthttsinfo(device, player, board, info)` - Send TTS info string to synth

### Heavy (TTS worker)
- `ttsinfo(device, player, engine, info)` - Send TTS info to ttsspace worker
- `ttsrequest(device, player, engine, config, voice, phrase)` - Request TTS from ttsspace worker
### Voice Configuration
- `synthvoice(device, player, board, idx, config, value)` - Configure synth voice
- `synthvoicefx(device, player, board, idx, fx, config, value)` - Configure voice effects

### Recording
- `synthrecord(device, player, board, filename)` - Start/stop audio recording

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
- `bridgechatstart(device, player, payload)` - Start or replace a chat connector. `payload` may be a string (legacy Twitch channel; `routekey` = channel) or an object `{ kind, routekey, … }` with `kind` `twitch` | `rss` | `mastodon` | `bluesky`. Twitch: optional `channel` (defaults to `routekey`). RSS: `feedurl`, optional `pollintervalsec` (default 120); **browser `fetch` only**—the feed URL must allow CORS from the app origin or be same-origin. Mastodon: `mastodoninstance`, and either `mastodonaccount` or `mastodonhashtag`, optional `mastodontoken`, optional `pollintervalsec`. Bluesky: `blueskyhandle`, optional `blueskyfeeduri` (`at://…` feed generator), optional `pollintervalsec`. Store tokens in saved bridge profiles (CLI `chat profile save`), not in shell history.
- `bridgechatstop(device, player, kind)` - Stop the connector for that `kind` (`twitch`, `rss`, `mastodon`, `bluesky`).
- `bridgestatus(device, player)` - Request a read-only snapshot of chat slots and IVS broadcast state (handled in `bridge.ts`, emitted as `apilog` lines; no secrets). **RSS, Mastodon, and Bluesky** pollers use `fetch` and run wherever the bridge runtime can reach the network (subject to CORS for browser origins).

### Peer Connection
- `bridgestart(device, player, hidden)` - Start peer server
- `bridgetab(device, player, hidden)` - Open join tab
- `bridgetabopen(device, player)` - Open join URL in new tab
- `bridgejoin(device, player, topic)` - Join peer connection
- `bridgeshowjoincode(device, player, hidden)` - Show join code/URL

---

## Patch API

**File:** [`patchapi.ts`](patchapi.ts)

Jsonpipe patch wire encoding for cross-realm sync. Import explicitly when emitting patches — not from `api.ts`.

- `boardrunnerpatch(device, player, patch, boundary?)` - jsonpipe patch of memory or a single boundary slice
- `gadgetclientpatch(device, player, patch)` - Apply jsonpipe patch to gadget state
- `vmboardrunnerpatch(device, player, patch, boundary?)` - Boardrunner sends a boundary jsonpipe patch back to authoritative memory

---

## Gadget Client

**File:** `gadgetclient.ts` (via api.ts)

Per-player gadget state synchronization. The previous `gadgetserver` device has been removed; the equivalent paint/patch is produced **inside the sim VM tick** by [`gadgetsynctick`](vm/gadgetsynctick.ts) and dispatched via the helpers below.

### Sim → Client
- `gadgetclientpaint(device, player, json)` - Paint full gadget state (desync)
- `gadgetclientbonk(device, player)` - Emit `gadgetclient:bonk` (CRT curve hit)
- `gadgetclientzap(device, player)` - Emit `gadgetclient:zap` (glitch pulse hit)

### Client → Sim
- `vmgadgetdesync(device, player)` - Ask the sim VM to repaint after a bad patch (also called by `register` after `acklogin`)

---

## Boardrunner

**File:** `boardrunner.ts` (via api.ts)

Per-board chip simulation that runs inside the **boardrunner worker**. The sim VM elects one player per active board to be its runner ([`vm/boardrunnermanagement.ts`](vm/boardrunnermanagement.ts)) and streams the data the runner needs.

### VM → Boardrunner
- `boardrunnerstart(device, player)` - One-shot `boardrunner:start`; worker sets `MEMORY.boardrunner`. Elected board id is `MEMORY.assignedboard` (from `boardrunner:tick`, cleared on `idle`).
- `boardrunnertick(device, player, board, timestamp, boundaries)` - Drive one tick on the runner for `board` with the listed boundary ids
- `boardrunnerpaint(device, player, doc, boundary?)` - Full jsonpipe sync of memory (no `boundary`) or a single boundary slice
- `boardrunnerinput(device, player, input, mods)` - Forward keyboard / gamepad input to the runner
- `boardrunneridle(device, player)` - Tell the previously-assigned runner that it is no longer the runner for that board
- `boardrunnerthud(device, player, thudplayer)` - Report a failed move back to the runner

### Boardrunner → VM
- `vmboardrunnerack(device, player)` - Ack a `boardrunner:tick`
- `vmboardrunneraccess(device, player, boardid)` - Register a board codepage id for tick/boundary hydration
- `vmboardrunnerpatch(device, player, patch, boundary?)` - Send a boundary jsonpipe patch back to authoritative memory
- `vmboardrunnerpaint(device, player, doc, boundary)` - Send a full boundary document to authoritative memory (sim resets jsonpipe for that boundary)
- `vmplayermovetoboard(device, player, targetplayer, board, dest)` - Ask the sim VM to relocate a player

---

## Message Forwarding

**File:** `forward.ts`

Functions for managing message forwarding between peers, server, client, and heavy worker.

### Forward Creation
- `createforward(handler)` - Create forward device with message handler

### Forwarding Rules
- `shouldnotforwardonpeerserver(message)` - Check if message should NOT forward on peer server
- `shouldforwardservertoclient(message)` - Check if message should forward sim→client (covers `vm`, `heavy`, `boardrunner`, `synth`, `modem`, `bridge`, `register`, `gadgetclient`, plus `log/chat/ticktock/ready/toast/second` topics and `sync/heavy/joinack/acklook/acklogin/ackoperator/ackzsswords/gadgetclient` path suffixes)
- `shouldnotforwardonpeerclient(message)` - Check if message should NOT forward on peer client
- `shouldforwardclienttoserver(message)` - Check if message should forward client→sim (`vm:*`, `modem:*`, `*sync` / `*desync` / `*joinack`)
- `shouldforwardclienttoheavy(message)` - Check if message should forward client→heavy (`heavy:*`, `second`, `ready`, `*acklook`)
- `shouldforwardheavytoclient(message)` - Check if message should forward heavy→client
- `shouldforwardclienttoboardrunner(message)` - Check if message should forward client→boardrunner (`boardrunner:*`, `vm:*`, `second`, `ready`). `vm:*` is forwarded so chip / scroll / sidebar messages also reach the chip OS running on the boardrunner.
- `shouldforwardboardrunnertoclient(message)` - Check if message should forward boardrunner→client

---

## Modem (Shared State)

**File:** `modem.ts`

Functions for shared state synchronization using Yjs (CRDT) and y-protocols (Awareness for presence).

### Types
- `PresenceState` - Presence info (clientId, name, color, cursor, select, codepageKey, lastSeen)
- `NodeId` - Identifies a shared text by key (for undo scope)
- `SharedTextHandle` - Handle for collaborative text (toJSON, insert, delete, length, nodeId)
- `MODEM_SHARED_TYPE` - Enum for shared type (NUMBER, STRING)

### React Hooks
- `useWaitForValueNumber(key)` - React hook to wait for number value
- `useWaitForValueString(key)` - React hook to wait for string value
- `usePresence(codepageKey)` - React hook to observe presence for a codepage

### Value Initialization
- `modemwriteinitnumber(key, value)` - Initialize number value in shared state
- `modemwriteinitstring(key, value)` - Initialize string value in shared state

### Value Writing
- `modemwritevaluenumber(key, value)` - Write number value to shared state
- `modemwritevaluestring(key, value)` - Write string value to shared state

### Value Observation
- `modemobservevaluenumber(key, callback)` - Observe number value changes
- `modemobservevaluestring(key, callback)` - Observe string value changes

### Undo / Redo
- `marknextpatchaslocal()` - Mark the next edit as local (for undo tracking)
- `consumelocalpatchflag()` - Consume the local-patch flag; returns true if next tx was local
- `setcursorbeforeedit(key, cursor)` - Store cursor before edit (for cursor restore on undo/redo)
- `getundomanager(key)` - Get Y.UndoManager for the shared text at key
- `registercursorrestore(key, restore)` - Register callback to restore cursor after undo/redo. Returns unregister.

### Presence (Awareness)
- `modembroadcastpresence(clientId, codepageKey, cursor, select?, name?, color?)` - Update local awareness state
- `getpresenceforcodepage(codepageKey)` - Get all presence states for a codepage

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

## Notes

- Most functions follow the pattern: `device.emit(player, target, data)`
- Functions in `api.ts` are convenience wrappers around device messaging
- Device-specific functions (like in `vm.ts`, `register.ts`) handle message routing internally
- The system uses a message-passing architecture with devices as message handlers
- Session management ensures messages are scoped to the correct session
- Player filtering ensures messages are routed to the correct player
