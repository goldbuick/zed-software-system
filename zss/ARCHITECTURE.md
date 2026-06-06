# ZSS architecture deep dive

## What it is

From the [root README](../README.md): a **ZZT-inspired, web-based fantasy terminal**—a creative-coding / game environment where boards, elements, and scripts feel like a retro terminal world. The repo is a **TypeScript monolith**: UI in [`cafe/`](../cafe/), engine in [`zss/`](.), CLI in [`src/`](../src/).

**Planned (design only, not implemented):** port game sim and script execution to **`zss_runtime.wasm`** (C++ bytecode VM + firmware). See [docs/wasm-sim-port.md](../docs/wasm-sim-port.md) and [docs/multiplayer-wasm-architecture.md](../docs/multiplayer-wasm-architecture.md).

---

## Repository layout

| Area | Role |
|------|------|
| [`cafe/`](../cafe/) | Vite root ([`vite.config.ts`](../vite.config.ts)); React + R3F Canvas; aliases `zss` and `cafe` |
| `zss/` | Engine: devices, VM, memory, firmware, lang, gadget rendering, features |
| [`src/commands/run.ts`](../src/commands/run.ts) + [`src/lib/app.tsx`](../src/lib/app.tsx) | oclif `zss` CLI: Playwright-hosted app + Ink terminal; static serve or Vite dev |

---

## Codebase map (domain boundaries)

Paths are under `zss/` unless noted.

```
cafe/           Application layer — React app entry, bootup
zss/screens/    High-level UI — Tape, Terminal, Panel, Editor, Inspector
zss/gadget/     Display, graphics, gadget data/state, user input device
zss/memory/     Domain logic — boards, elements, books, inspection
zss/words/      Domain types — COLOR, NAME, STAT_TYPE, parsers
zss/device/     Infrastructure — API, session, VM, forward, register, clock, …
zss/firmware/   Command vocabulary — CLI, loader, runtime, board, element, …
zss/feature/    Feature modules — ROM, parse, heavy (AI), synth, storage, …
zss/mapping/    Pure utilities — array, string, number, 2d, types, guid, …
zss/feature/lang/       Script compiler (TS backend + native parity target)
```

### Layer dependencies

- **cafe** and **zss/screens** depend on gadget, memory, device
- **gadget** depends on memory, words, mapping
- **memory** depends on words, mapping
- **words** depends on mapping
- **feature** modules depend on device, memory, gadget as needed
- **mapping** has no internal zss dependencies (pure utilities)

### Key modules

| Module | Purpose |
|--------|---------|
| `zss/words/` | Domain enums (COLOR, COLLISION, STAT_TYPE), parsers (color, dir, kind), textformat |
| `zss/mapping/` | Pure helpers: array, string, number, 2d, types, value, guid, anim, tick, qr, func |
| `zss/memory/` | Board/element operations, inspection, books, codepage |
| `zss/gadget/` | Rendering engine, state, display, graphics components |

---

## Runtime: main thread vs workers

Boot flow:

1. [`cafe/index.tsx`](../cafe/index.tsx) loads [`zss/userspace.ts`](userspace.ts) (side-effect imports of main-thread devices), then renders [`cafe/app.tsx`](../cafe/app.tsx) → [`zss/gadget/engine.tsx`](gadget/engine.tsx).
2. `Engine` calls [`createplatform()`](platform.ts): `sessionreset` on [`SOFTWARE`](device/session.ts), spawns **heavyspace** (LLM/TTS-heavy work), **boardrunnerspace** (per-board sim), and **simspace** or **stubspace** (authoritative VM).

[`zss/simspace.ts`](simspace.ts) runs **inside the sim worker**: imports `clock` and `modem`, wires `createforward` so messages that must reach the browser UI are `postMessage`’d out, then calls `started()` from [`zss/device/vm.ts`](device/vm.ts) which dispatches per-tick handlers (including the per-player gadget projection in [`gadgetsynctick`](device/vm/gadgetsynctick.ts)).

[`zss/boardrunnerspace.ts`](boardrunnerspace.ts) runs **inside the boardrunner worker**: imports [`device/boardrunner`](device/boardrunner.ts) (thin entry; logic in [`device/boardrunner/`](device/boardrunner/)), which receives jsonpipe paint/patch slices of memory ("boundaries") for the board it has been elected to run, executes [`memorytickmain`](memory/runtime.ts) for that board, and emits boundary patches back to the sim VM.

[`zss/userspace.ts`](userspace.ts) registers **main-thread** devices: `gadgetclient`, `modem`, `bridge`, `register`, `synth`.

**Important detail:** each realm (main window vs each worker) has its **own** [`hub`](hub.ts) instance (separate JS globals). [`zss/device/forward.ts`](device/forward.ts) bridges realms: a `forward` device subscribes to topic `all`, dedupes by `message.id`, and either invokes the local `hub` or `postMessage`s to the parent/worker per `shouldforward*` helpers in that file. [`zss/platform.ts`](platform.ts) wires sim ↔ main, heavy ↔ main, and boardrunner ↔ main, and also re-routes worker-originated messages between workers via main when their target prefix matches the destination realm.

```mermaid
flowchart LR
  subgraph main [Main thread]
    Register[register]
    GadgetClient[gadgetclient]
    Synth[synth]
    Bridge[bridge]
    HubMain[hub]
    ForwardMain[forward device]
  end
  subgraph sim [sim worker]
    VM[vm]
    Clock[clock]
    Modem[modem]
    HubSim[hub]
    ForwardSim[forward device]
  end
  subgraph heavy [heavy worker]
    HeavyDev[heavy features]
  end
  subgraph br [boardrunner worker]
    BoardRunner[boardrunner]
  end
  ForwardMain <-->|postMessage| ForwardSim
  ForwardMain <-->|postMessage| HeavyDev
  ForwardMain <-->|postMessage| BoardRunner
  HubMain --> Register
  HubMain --> GadgetClient
  HubSim --> VM
```

CLI / headless mode ([`cafe/index.tsx`](../cafe/index.tsx) `bootheadless`) skips Canvas and calls `createplatform(..., true)` so Playwright drives the same stack without WebGL.

**Planned worker layout:** one **wasm worker** (sim + synth coordinator + `zss_runtime`) and one **heavy** worker; retire sim, boardrunner, and stub workers. Multiplayer stays PeerJS on main; host MAIN book memory authoritative. Details: [docs/multiplayer-wasm-architecture.md](../docs/multiplayer-wasm-architecture.md).

---

## The hub: message-passing backbone

[`zss/hub.ts`](hub.ts): a **fan-out bus**. `hub.emit` builds a [`MESSAGE`](device/api.ts) and `hub.invoke` calls `device.handle` on **every** connected device.

[`zss/device.ts`](device.ts) `createdevice`:

- **`emit(player, target, data)`** → goes through hub with session + sender id.
- **Routing:** `parsetarget` splits `target` on `:` (e.g. `vm:operator` → device `vm`, path `operator`).
- Devices match if: subscribed **topic** equals the message target (e.g. `ticktock`, `tock`, `second`), **or** message is addressed to device id / name / `all`.
- **`reply` / `replynext`:** convenience for responses along `sender:subtarget`.

Authoritative diagrams: [`zss/device/docs/message-flow.md`](device/docs/message-flow.md) (mermaid + ASCII) and [`zss/device/docs/devices-and-messaging.md`](device/docs/devices-and-messaging.md) (all devices, three realms, forwarding).

---

## VM and handlers (game / OS logic)

[`zss/device/vm.ts`](device/vm.ts) creates the `vm` device (topics `ticktock`, `second`). Each message is dispatched via [`zss/device/vm/handlers/registry.ts`](device/vm/handlers/registry.ts) by `message.target` (e.g. `operator`, `cli`, `input`, `loader`, `books`, `ticktock`, …). Shared mutable VM state lives in [`zss/device/vm/state.ts`](device/vm/state.ts) (including the **boardrunner election** maps: `boardrunners` board → player, `playerrunners` player → board, `boardrunneracks` ack budget, `boardrunnerblocked`).

Each [`ticktock`](device/vm/handlers/ticktock.ts) the VM:

1. Drives the `pilot` system and ticks loaders ([`memorytickloaders`](memory/runtime.ts)).
2. Builds per-player gadget projections (paint/patch to `gadgetclient`) via [`gadgetsynctick`](device/vm/gadgetsynctick.ts).
3. Re-elects a runner per active board (`boardrunnerelect` / `boardrunnerevict`), enforces an ack budget, and emits `boardrunner:tick` to each elected runner with the board id, timestamp, and the list of [boundary ids](memory/boundaryrouting.ts) needed to run that board.
4. Streams memory and boundary diffs to the boardrunner worker through [`boardrunnermemorysync`](device/vm/boardrunnermemorysync.ts) and [`boardrunnerboundarymemorysync`](device/vm/boardrunnerboundarysync.ts) (jsonpipe full sync + patches).

The **`register`** device ([`zss/device/register.ts`](device/register.ts)) is the **UI-facing edge**: storage, session, tape/terminal/editor zustand stores, and it **emits** `vm:*` calls (via [`zss/device/api.ts`](device/api.ts)) so user actions become VM work.

---

## Memory: world model

Documented in [`zss/memory/docs/README.md`](memory/docs/README.md):

- **MEMORY** singleton: books, software slots, loaders, session, operator, etc.
- **BOOK** → **CODE_PAGE** (board / object / terrain / charset / palette / loader)
- **BOARD**: 60×25-style grid, elements, named lookup
- **BOARD_ELEMENT**: kind, position, char, color, code, collision, …

Memory APIs are consumed by the chip runtime, firmware (`send`, movement, etc.), and the gadget pipeline (rendering conversion in `memory/rendering.ts` and related modules).

---

## Lang → chip → firmware (behavior)

**Lang** ([`zss/feature/lang/docs/README.md`](feature/lang/docs/README.md)): lexer → Chevrotain parser → visitor (CST→AST) → transformer → `new Function('api', code)`. Entry: `compile()` via [`zss/feature/lang`](feature/lang/index.ts).

**Chip** ([`zss/chip.ts`](chip.ts)): per-element **VM** with `get`/`set`, `tick`, generator execution, messaging, and integration with **firmware** via [`zss/firmware/runner.ts`](firmware/runner.ts).

**Firmware** ([`zss/firmware/docs/README.md`](firmware/docs/README.md)): `createfirmware()` registers `#commands`, optional `get`/`set` hooks, `everytick`/`aftertick`. **Drivers** compose firmware for three contexts:

| Driver | Purpose |
|--------|---------|
| `CLI` | Terminal / software commands |
| `LOADER` | Importing external content |
| `RUNTIME` | Codepage execution on boards |

Shared stdlib: `audio`, `board`, `network`, `transform`, `element`. Example runtime commands in [`zss/firmware/runtime.ts`](firmware/runtime.ts) (`send`, `text`, `hyperlink`, `help`, …) bridge script to **gadget** APIs and **memory** (`memorysendtoelements`, etc.).

---

## Gadget: simulation state → pixels

Rough pipeline:

1. **`gadgetsynctick`** (sim worker, called from the VM `ticktock` handler in [`device/vm/handlers/ticktock.ts`](device/vm/handlers/ticktock.ts)): for every active player, projects the cached per-board gadget layers ([`memoryreadbookgadgetlayersforboard`](memory/gadgetlayersflags.ts)) plus the live control layer into the player's gadget state, then emits **`gadgetclient:patch`** (or **`gadgetclient:paint`** when the player asks for a desync) via [`device/api.ts`](device/api.ts).
2. **`gadgetclient`** (main, [`device/gadgetclient.ts`](device/gadgetclient.ts)): replays the jsonpipe paint/patch into the **zustand** store in [`zss/gadget/data/state.ts`](gadget/data/state.ts) (`useGadgetClient`, tape/editor/inspector stores). Bad patches reply `gadgetdesync` to the sim VM.
3. **`Engine`** / [`zss/screens/`](screens/) / [`zss/gadget/display/`](gadget/display/): R3F orthographic scene, tiles/sprites, CRT-style effects, tape UI.

Note that the previous `gadgetserver` device has been removed: the same paint/patch messages are now produced **inside the VM tick** (no separate device or `tock` topic), and the `boardrunner` worker handles the per-board chip simulation that used to share that hub.

**Tape editor / terminal input:** [`zss/screens/tape/autocomplete.ts`](screens/tape/autocomplete.ts) computes `#` command and word-list suggestions from lexer tokens and firmware word tables; [`zss/screens/tape/commandarghints.ts`](screens/tape/commandarghints.ts) loads optional long-form help from ROM keys `editor:commands:<name>` (Markdown with YAML `hint:` or legacy `desc;…` lines), cached per command. [`zss/screens/tape/autocompleteui.ts`](screens/tape/autocompleteui.ts) shares suggestion-apply and terminal hint placement. See [`zss/screens/tape/README.md`](screens/tape/README.md).

So: **memory is authoritative**; gadget state is a **projection** for rendering and UI.

---

## Features and integrations

Scattered under [`zss/feature/`](feature/): storage (idb), TTS/STT, URL/multiplayer hooks, parsing, etc. [`zss/device/heavy.ts`](device/heavy.ts) and the **heavyspace** worker isolate expensive browser APIs (e.g. transformers, ONNX) from the sim loop.

**`modem`**: networking / sync-related message handling (present on both sides as imported modules—routing distinguishes behavior).

**`bridge`**: external-world actions (fetch, streams, chat bridges); see [`zss/device/docs/message-flow.md`](device/docs/message-flow.md).

---

## CLI packaging

[`package.json`](../package.json): `zss` binary via oclif; `cli:build` compiles `src/` and runs `oclif manifest`. The CLI serves `cafe/dist` or talks to the Vite dev server and injects Node hooks (`__nodeStorageReadPlayer`, `__onCliInput`) for headless operation ([`cafe/index.tsx`](../cafe/index.tsx)).

**Production Linux tarball:** `yarn cli:build:linux` runs a **production** Vite build (`NODE_ENV=production`), compiles the CLI, installs Playwright’s headless shell for the pack target, then `oclif pack tarballs` (which runs `npm pack` and bundles production `node_modules`).

**Embedding static content in the shipped CLI:** oclif’s pack step uses **`npm pack`**, which only includes paths listed under [`package.json` `files`](../package.json) (plus a few npm defaults). The built cafe UI must be listed there as **`cafe/dist`** (output of `yarn app:build`). Add other paths the same way if the CLI must ship extra assets; keep large or secret paths out of `files` so they are not published in the tarball.

---

## Mental model (one paragraph)

**ZSS** keeps **game and engine state in memory**, runs **script as compiled code on chips** with **firmware** defining the command vocabulary, and uses a **session-scoped message hub** so the **VM (sim worker)**, the **boardrunner worker** (per-board chip ticks), the **heavy worker** (LLM / TTS), and the **React UI (main)** stay loosely coupled: UI sends `vm:*` messages, the VM mutates memory and elects a player on each active board to be its **boardrunner** (jsonpipe-synced board + boundary slices), each tick the VM also projects the per-player gadget state into **`gadgetclient:patch`** messages, and the **gadgetclient** store feeds the Three.js terminal aesthetic.

**Planned:** same hub pattern, but sim ticks and firmware run inside **`zss_runtime.wasm`** in a single wasm worker; PeerJS carries **`vm:memorypatch`** (renamed from boardrunner patch targets) from host to joins. See [docs/wasm-sim-port.md](../docs/wasm-sim-port.md).
