# Plan: CLI-Only Server Mode for Zed Cafe

## Overview

Create a headless, Node.js-based server mode that runs the ZSS simulation without any browser, React, WebGL, or DOM. Intended for:

- Remote/SSH-style CLI sessions
- Scripting and automation
- CI/CD or batch processing
- Lightweight deployment (no browser runtime)

---

## Current Architecture (Browser Mode)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MAIN THREAD (Browser)                                                    │
│  • React + Three.js Engine                                                │
│  • createplatform() → spawns workers                                      │
│  • register, gadgetclient, bridge, synth, modem (front-end devices)       │
│  • Storage: IndexedDB, sessionStorage, location.hash                      │
│  • Input: keyboard, gamepad, touch → register:input                       │
│  • Output: useTape, useGadgetClient (Zustand) → rendered to canvas         │
└─────────────────────────────────────────────────────────────────────────┘
         │ postMessage                              │ postMessage
         ▼                                          ▼
┌──────────────────────┐                 ┌──────────────────────┐
│  SIMSPACE (Worker)   │                 │  HEAVYSPACE (Worker) │
│  • clock, vm         │                 │  • TTS, LLM models   │
│  • gadgetserver      │                 │  • Lazy-loaded        │
│  • modem             │                 └──────────────────────┘
│  • hub (in-process)  │
└──────────────────────┘
```

---

## Target Architecture (CLI Server Mode)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MAIN THREAD (Node.js)                                                    │
│  • register-server, stdin loop, message routing                           │
│  • Storage: filesystem (config dir, content files)                        │
│  • Input: stdin                                                           │
│  • Output: stdout                                                         │
│  • Uses worker_threads.Worker for sim + heavy                             │
└─────────────────────────────────────────────────────────────────────────┘
         │ worker.postMessage / parentPort.postMessage
         ▼
┌──────────────────────┐                 ┌──────────────────────┐
│  SIMSPACE            │                 │  HEAVYSPACE          │
│  (worker_thread)     │                 │  (worker_thread)     │
│  • clock, vm         │                 │  • TTS, LLM models   │
│  • gadgetserver      │                 │  • Lazy-loaded        │
│    (headless)        │                 │                      │
│  • modem             │                 │                      │
└──────────────────────┘                 └──────────────────────┘
```

---

## Phases

### Phase 1: Remove Tauri Build and Dependencies

**Goal**: Remove the Tauri native desktop build and all related dependencies to simplify the codebase and avoid Rust/WebView toolchain requirements.

**Tasks**:

1. **Remove package.json Tauri scripts**
   - Delete: `tauri`, `tauri:version`, `tauri:win`, `tauri:macos`

2. **Remove package.json Tauri devDependencies**
   - Delete: `@tauri-apps/api`, `@tauri-apps/cli`, `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-opener`

3. **Remove `src-tauri/` directory**
   - Delete entire Rust/Tauri project (Cargo.toml, Cargo.lock, build.rs, src/, tauri.conf.json, icons, etc.)

4. **Remove or update `sync-version.ts`**
   - Delete tauri.conf.json sync logic; keep only package.json version sync if needed elsewhere, or remove script entirely

5. **Update `zss/feature/storage.ts`**
   - Remove `@tauri-apps/api/path` and `@tauri-apps/plugin-fs` imports
   - Remove `@tauri-apps/plugin-opener` import
   - Remove all `istauri` branches; storage uses browser (IndexedDB, location.hash) only
   - Tauri-specific paths (e.g. BaseDirectory.AppData) no longer used

6. **Update CI/CD (`.github/workflows/`)**
   - Remove Tauri build jobs from `on-push-tag-build.yml` (or equivalent)
   - Keep web/Vite build jobs

**Note**: After this phase, the app runs as web-only (browser). Native desktop builds are no longer supported. CLI server mode (later phases) uses Node + filesystem, not Tauri.

---

### Phase 2: Extract Core Simulation with worker_threads

**Goal**: Run simspace and heavyspace in Node using `worker_threads`, mirroring browser architecture but with Node's Worker API.

**Tasks**:

1. **Create `zss/server/` entry**
   - New entry point: `server/index.ts` or `zss/server/main.ts`
   - Spawns simspace and heavyspace via `worker_threads.Worker`
   - Main thread runs: register-server, stdin loop, message routing
   - Do NOT import: platform, Engine, React, Three, userspace (gadgetclient, register browser version)

2. **Simspace worker (worker_thread)**
   - Create `zss/server/simspace.worker.ts` (or reuse `simspace.ts` with Node entry):
     - Imports `./device/clock`, `./device/gadgetserver`, `./device/modem`, `./device/vm`
     - Uses `worker_threads.parentPort` to receive/send messages (same message shape as browser postMessage)
     - Calls `started()` from vm (same as simspace)
     - Gadgetserver runs in headless mode (no-ops on paint/patch)

3. **Heavyspace worker (worker_thread)**
   - Create `zss/server/heavyspace.worker.ts` (or adapt `heavyspace.ts`):
     - TTS, LLM models run in this worker
     - Uses `parentPort` for message passing
     - Lazy-loads heavy deps (transformers, onnx) inside worker

4. **Platform server: createplatformserver()**
   - Spawns `Worker` from `worker_threads` for simspace and heavyspace
   - Uses `worker.postMessage()` and `worker.on('message', ...)` — API similar to Web Worker
   - Forwards messages between main thread (register, stdin) and workers using same forward logic as `zss/device/forward.ts`
   - Handles `worker.terminate()` on shutdown

5. **Message serialization**
   - `worker_threads` supports structured clone (same as postMessage); ensure message payloads are serializable (no functions, no DOM refs)

**Dependencies to stub or avoid**:

- `window`, `document`, `location`, `sessionStorage` → Node equivalents or mocks
- `idb-keyval` (IndexedDB) → filesystem
- Vite `??worker` imports → use `path.join(__dirname, 'simspace.worker.js')` with Worker constructor for Node

---

### Phase 3: Server-Side Register & Storage

**Goal**: Replace browser register and storage with a Node-friendly implementation.

**Tasks**:

1. **Create `zss/device/registerserver.ts`**
   - Same message targets as register: `ready`, `ackoperator`, `acklogin`, `loginready`, `input`, `log`, `toast`, etc.
   - **Storage**: Use `zss/feature/storage-server.ts`:
     - Config: `~/.zss/config.json` or `./.zss/config.json`
     - Content: `~/.zss/content/` or env `ZSS_CONTENT_DIR`
     - Session/player ID: random or from env `ZSS_PLAYER_ID`
   - **Output**: Instead of `useTape.setState`, write to:
     - `process.stdout` for log messages
     - Or a callback/stream for piping

2. **Create `zss/feature/storage-server.ts`**
   - Implement same interface as `storage.ts`:
     - `storagereadconfig`, `storagewriteconfig`
     - `storagereadcontent`, `storagewritecontent`
     - `storagereadvars`, `storagewritevar`
     - `storagereadhistorybuffer`, `storagewritehistorybuffer`
   - Back by `fs` and `path` (Node)
   - No `indexedDB`, `sessionStorage`, `location.hash`

3. **Session / player ID**
   - In browser: `sessionStorage.getItem('PLAYER')` or `createpid()`
   - In server: `process.env.ZSS_PLAYER_ID` or `createpid()` stored in `~/.zss/session.json`

4. **PeerJS / Bridge (multiplayer)**
   - Keep PeerJS in server mode; multiplayer is a core feature
   - Bridge device and netterminal may need Node-compatible storage (e.g. `~/.zss/netid` instead of IndexedDB for peer ID)
   - Ensure message forwarding (client↔server, join/host flows) works when server is host or client

---

### Phase 4: CLI Input/Output

**Goal**: Accept CLI commands via stdin and emit log/toast to stdout.

**Tasks**:

1. **Input**
   - Use `readline` or `process.stdin` in Node
   - On each line: `vmcli(SOFTWARE, playerid, line)`
   - Handle `#`-prefixed commands (e.g. `#help`, `#pages`) same as browser

2. **Output**
   - Register-server handles `log` messages → `console.log` (or write to stream)
   - Strip or simplify ANSI/format codes for plain terminal, or keep for `$green`-style output
   - `toast` → `console.log` or `stderr`

3. **Boot sequence**
   - Emit `ready` (or call platformready on SOFTWARE/inline device)
   - Register-server receives `ready` → init storage, call `vmoperator`
   - VM acks `ackoperator` → register loads content via `loadmem` or `vmloader`
   - Same flow as browser, minus DOM/gadget

---

### Phase 5: Build & Run Configuration

**Goal**: Separate build/runtime for server vs browser.

**Tasks**:

1. **TSConfig / build**
   - `tsconfig.server.json` or `vite.config.server.ts`:
     - Target Node
     - Exclude browser-only: React, Three, canvas, idb-keyval
     - Resolve `zss/feature/storage` → `zss/feature/storage-server` when building server
   - Or use `tsx` / `ts-node` for dev; `tsc` + `node` for prod

2. **Package scripts**
   - `"server": "tsx zss/server/main.ts"` or `"start:server": "node dist-server/main.js"`
   - `"build:server": "tsc -p tsconfig.server.json"`

3. **Env / flags**
   - `ZSS_MODE=server` or `--server` flag
   - `ZSS_CONTENT_DIR`, `ZSS_PLAYER_ID` for server config

4. **Node.js requirement**
   - `worker_threads` is built-in (Node 12+); no extra deps

---

### Phase 6: Multiplayer on Boot + Stub Book

**Goal**: On server boot, start multiplayer as host, create a minimal stub book, and open the join URL in the user's browser.

**Tasks**:

1. **Stub book creation**
   - Create `zss/server/stubbook.ts` or similar that builds a minimal BOOK with two codepages:
     - **@player** — OBJECT codepage (player kind); minimal stats so the sim has a player element
     - **@board** — BOARD codepage with a title (e.g. "title" or "Welcome"); defines the starting board
   - **Only create stub when file storage does not have @player or @board title** — check loaded content (from `storagereadcontent` / `loadmem`) for existing codepages; if both are present, skip stub and use loaded content
   - Use `memorycreatecodepage`, `memorycreatebook`, `memoryresetbooks` to inject the stub when needed
   - Stub book must satisfy: at least one board, player object that can be placed on that board

2. **Boot sequence**
   - After platform/server is ready and operator is set:
     - Load content from file storage; only create/load stub book when content lacks @player or @board title
     - Call `netterminalhost()` (or equivalent server-side) to start PeerJS host
     - Wait for Peer to be ready and `readsubscribetopic()` to return the peer/topic ID

3. **Join URL**
   - Build join URL: `http://localhost:7777/join/#${topic}` (or configurable `ZSS_WEB_ORIGIN` + port)
   - Server runs CLI; web app runs separately (Vite dev or deployed). Join URL points at the web app's `/join/` route with the topic hash

4. **Open in browser**
   - Use Node's `child_process.exec` or `open` package: `open(joinurl)` (macOS) / `xdg-open` (Linux) / `start foremost` (Windows)
   - Or `require('child_process').exec(\`open "${joinurl}"\`)` with cross-platform handling
   - Alternative: print join URL to stdout so user can click/copy; optional `--open` flag to auto-open

5. **Netterminal / PeerJS in server**
   - Ensure `netterminalhost()` works in Node (PeerJS supports Node)
   - Peer ID stored in `~/.zss/netid` (storage-server) instead of IndexedDB
   - Bridge device must be loaded in server register; handle `bridge:start`, `bridge:tabopen` etc.

**Dependencies**:
- `open` (npm) for cross-platform "open URL in browser", or use Node `child_process` with OS-specific commands

---

## Dependency Graph (What to Exclude in Server)

| Module              | Browser | Server |
|---------------------|---------|--------|
| React, Three, R3F   | ✓       | ✗      |
| idb-keyval          | ✓       | ✗ (use storage-server) |
| sessionStorage      | ✓       | ✗ (use file) |
| Tone/synth          | ✓       | ✗ (no audio in CLI server) |
| PeerJS, bridge      | ✓       | ✓ (keep for multiplayer) |
| heavyspace          | ✓       | ✓ (worker_thread) |
| userspace (cafe UI) | ✓       | ✗      |
| register.ts         | ✓       | ✗ (use registerserver) |
| gadgetclient        | ✓       | ✗      |
| gadgetserver        | ✓       | headless / no-op |

---

## File Layout

```
zss/
  server/
    main.ts              # Entry: init storage-server, register-server, spawn workers, stdin loop
    simspace.worker.ts   # worker_thread: clock, vm, gadgetserver-headless, modem
    heavyspace.worker.ts # worker_thread: TTS, LLM
    platform-server.ts   # createplatformserver(): spawns workers, message forwarding
    stubbook.ts          # Minimal book: @player + @board codepages for boot
  device/
    registerserver.ts    # Server-side register
  feature/
    storage-server.ts    # FS-backed storage
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Circular imports when splitting storage | Use dependency injection or a small `storage-adapter` interface |
| Worker API differences (Web Worker vs worker_threads) | Use adapter or shared message format; worker_threads.postMessage mirrors postMessage |
| Heavy deps (transformers, onnx) in server | Keep lazy; optional flag to disable heavy entirely |
| Synth/Tone depends on Web Audio | Exclude synth in server mode; no audio |

---

## Success Criteria

1. Run `yarn server` (or equivalent) and get a REPL that accepts ZSS CLI commands
2. `#help`, `#pages`, `#load`, etc. work as in browser
3. Content loads from filesystem; can save/load games
4. No browser, no canvas, no React required
5. (Phase 6) On boot: multiplayer host starts, stub book loads, join URL opens in browser

---

## References

- [zss/device/docs/message-flow.md](../zss/device/docs/message-flow.md) — Device message flow
- [zss/ARCHITECTURE.md](../zss/ARCHITECTURE.md) — Domain boundaries
- [zss/feature/docs/storage.md](../zss/feature/docs/storage.md) — Storage API
- `zss/simspace.ts`, `zss/platform.ts`, `zss/device/register.ts` — Current bootstrap
