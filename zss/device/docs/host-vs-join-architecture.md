# Host vs Join device and message architecture

A detailed view of every device in ZSS, which thread/worker it lives in, and every edge of the message graph — split into **host state** (the player running the multiplayer session) and **join state** (a player connecting via `/join/…` URL), including which messages cross the **PeerJS** wire.

**Context:** see also [devices-and-messaging.md](./devices-and-messaging.md), [message-flow.md](./message-flow.md), [../../ARCHITECTURE.md](../../ARCHITECTURE.md), and [../../feature/docs/netterminal.md](../../feature/docs/netterminal.md).

## Contents

- [Legend](#legend)
- [1. Device catalog](#1-device-catalog)
- [2. Where each device runs (host vs join)](#2-where-each-device-runs-host-vs-join)
- [3. Host state diagram](#3-host-state-diagram)
- [4. Join state diagram](#4-join-state-diagram)
- [5. PeerJS wire between host and join](#5-peerjs-wire-between-host-and-join)
- [6. Forwarding policies (the source of truth)](#6-forwarding-policies-the-source-of-truth)
- [7. Notable host-vs-join deltas](#7-notable-host-vs-join-deltas)
- [8. Code reference index](#8-code-reference-index)

---

## Legend

- **Solid arrow** — in-process hub dispatch (same thread/worker), `hub.invoke(message)`.
- **Dashed arrow** — `postMessage` bridge between main thread and a worker, gated by `forward.ts` policies.
- **Bold red arrow** — PeerJS `DataConnection` across the network (host main thread ↔ remote join peer main thread).
- Boxes are labeled with the device's **routing name** (the `name` arg in `createdevice(name, topics?, handler)`); groups are colored by worker/realm.
- A single browser always has **four realms** at most: `main`, `platform` (sim *or* stub), `heavy`, `boardrunner`. PeerJS only exists on main.

---

## 1. Device catalog

Every device is created with `createdevice(name, topics?, handler, session?)` (see [`zss/device.ts`](../../device.ts) 36–107). Each device has:

- a **routing name** (stable, used in `target = 'name:path'`)
- an opaque **session id** from `createsid()` used as `message.sender` for direct replies

### Main thread (browser hub)

Loaded via side-effect imports in [`zss/userspace.ts`](../../userspace.ts) (UI) plus [`zss/platform.ts`](../../platform.ts) (for the main-side `forward`).

| Routing name | File | Role |
|---|---|---|
| `register` | [`zss/device/register.ts`](../register.ts) 286–303 | UI / bootstrap: storage, bookmarks, terminal/editor, `vm:*` calls, login flow, `second` → `vm:doot` keepalive, multiplayer branch (`bridgejoin` vs `loadmem`) on `ackoperator` (342–349). |
| `gadgetclient` | [`zss/device/gadgetclient.ts`](../gadgetclient.ts) 9–81 | Applies `paint` / `patch` to React gadget state; on patch failure emits `boardrunner:desync` (69–70). |
| `bridge` | [`zss/device/bridge.ts`](../bridge.ts) 192–575 | PeerJS session UX: host/join/tab, join URL, network `fetch` → `vmloader`, chat connectors, IVS broadcast. |
| `modem` | [`zss/device/modem.ts`](../modem.ts) 423–488 | Yjs doc + awareness sync; handles `join` / `joinack` / `sync` / `modem:awareness`. |
| `synth` | [`zss/device/synth.ts`](../synth.ts) 141+ | Web Audio / Tone; volume, TTS routing, `audioenabled` → `vmloader`. |
| `jsonsyncclient` | [`zss/device/jsonsyncclient.ts`](../jsonsyncclient.ts) 101+ | Client CRDT sync: `snapshot`, `serverpatch`, `antipatch`, `needsnapshot`, `poke`; emits local `jsonsync:changed` (api.ts 265–267). |
| `SOFTWARE` | [`zss/device/session.ts`](../session.ts) 4 | Session singleton used as a convenient `DEVICELIKE` emit target. |
| `forward` | [`zss/platform.ts`](../../platform.ts) 37–47 (`createdevice('forward', ['all'], …)`) | Bridges `postMessage` ↔ main hub ([`zss/device/forward.ts`](../forward.ts) 31–36). |

### Sim worker (`simspace`) — host only

Loaded in [`zss/simspace.ts`](../../simspace.ts); `createplatform(false, …)` selects this worker ([`zss/platform.ts`](../../platform.ts) 32–33, [`zss/gadget/engine.tsx`](../../gadget/engine.tsx) 37–38).

| Routing name | File | Role |
|---|---|---|
| `vm` | [`zss/device/vm.ts`](../vm.ts) 8–18 | Dispatches `message.target` through `vmhandlers` / default ([`zss/device/vm/handlers/registry.ts`](../vm/handlers/registry.ts)). |
| `clock` | [`zss/device/clock.ts`](../clock.ts) 4–43 | Emits `ticktock` (frame) and `second` (1 Hz) with `player ''` (24–31). |
| `jsonsyncserver` | [`zss/device/jsonsyncserver.ts`](../jsonsyncserver.ts) 118–197 | Authoritative jsonsync streams; `clientpatch`, `needsnapshot`; merges via `memorysyncreverseproject` (146–148). |
| `user` | [`zss/device/user.ts`](../user.ts) 10–20 | Server-side `user:input` only (`handleuserinput`). |
| `modem` (worker copy) | [`zss/device/modem.ts`](../modem.ts) | Second instance of the Yjs protocol in the sim worker. |
| `gadgetmemoryprovider` | [`zss/device/gadgetmemoryprovider.ts`](../gadgetmemoryprovider.ts) | Backs `gadgetstate()` from `mainbook.flags[GADGETSTORE]` on sim. |
| `forward` | [`zss/simspace.ts`](../../simspace.ts) 14–17 | Forwards `shouldforwardservertoclient` to parent `postMessage`. |

### Stub worker (`stubspace`) — join only

Loaded in [`zss/stubspace.ts`](../../stubspace.ts); `createplatform(true, …)` selects this worker when [`isjoin()`](../../feature/url.ts) 19–21 (URL contains `/join/`).

| Routing name | File | Role |
|---|---|---|
| `vm` | [`zss/device/stub.ts`](../stub.ts) 9–26 | Minimal VM: only `operator` → `ackoperator` (16–22). **No** `clock`, `jsonsyncserver`, `user`, or full game VM. |
| `forward` | [`zss/stubspace.ts`](../../stubspace.ts) 6–8 | Forwards **all** messages to parent `postMessage` (no `shouldforwardservertoclient` filter). |

### Heavy worker (`heavyspace`)

Loaded in [`zss/heavyspace.ts`](../../heavyspace.ts); [`zss/device/heavy.ts`](../heavy.ts) 302–444.

| Routing name | Role |
|---|---|
| `heavy` | LLM / TTS / agent jobs: `ttsinfo`, `ttsrequest`, `modelprompt`, `modelstop`, `llmpreset`, `queryresult`, `pullvarresult`, `agentstart/stop/list/name`, `syncuserdisplay`, `restoreagents`. |
| `forward` | Forwards `shouldforwardheavytoclient` to parent ([`heavyspace.ts`](../../heavyspace.ts) 6–8). |

### Boardrunner worker (`boardrunnerspace`)

Loaded in [`zss/boardrunnerspace.ts`](../../boardrunnerspace.ts); core device [`zss/device/boardrunner.ts`](../boardrunner.ts) 138–268.

| Routing name | File | Role |
|---|---|---|
| `boardrunner` | [`zss/device/boardrunner.ts`](../boardrunner.ts) | Authoritative tick for **owned** boards: `jsonsync:changed` → hydrate; `ticktock` → `runworkertick` (pilot + `memorytickmain` + gadget sync + `memoryworkerpushdirty`); `ownedboards`; `desync`; `clearscroll`. |
| `user` | [`zss/device/boardrunneruser.ts`](../boardrunneruser.ts) 39–58 | Worker `user:input`, `user:pilotstart/stop/clear`. |
| `jsonsyncclient` | [`zss/boardrunnerspace.ts`](../../boardrunnerspace.ts) 9 | Same jsonsync client. |
| `gadgetmemoryprovider` | [`zss/boardrunnerspace.ts`](../../boardrunnerspace.ts) 8 | Worker gadget store + dirty marking ([`boardrunner.ts`](../boardrunner.ts) 34–57). |
| `forward` | [`zss/boardrunnerspace.ts`](../../boardrunnerspace.ts) 11–21 | `allowticktock: true` so `ticktock` is not dropped at worker boundary ([`forward.ts`](../forward.ts) 17–26). |

---

## 2. Where each device runs (host vs join)

| Device | Host main | Host sim | Host heavy | Host br | Join main | Join stub | Join heavy | Join br |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `register` | ✓ | | | | ✓ | | | |
| `gadgetclient` | ✓ | | | | ✓ | | | |
| `bridge` | ✓ | | | | ✓ | | | |
| `modem` (main) | ✓ | | | | ✓ | | | |
| `synth` | ✓ | | | | ✓ | | | |
| `jsonsyncclient` (main) | ✓ | | | | ✓ | | | |
| `SOFTWARE` | ✓ | | | | ✓ | | | |
| `forward` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `vm` (full) | | ✓ | | | | | | |
| `vm` (stub) | | | | | | ✓ | | |
| `clock` | | ✓ | | | | | | |
| `jsonsyncserver` | | ✓ | | | | | | |
| `user` (sim) | | ✓ | | | | | | |
| `modem` (worker) | | ✓ | | | | | | |
| `gadgetmemoryprovider` | | ✓ | | ✓ | | | | ✓ |
| `heavy` | | | ✓ | | | | ✓ | |
| `boardrunner` | | | | ✓ | | | | ✓ |
| `user` (boardrunner pilot) | | | | ✓ | | | | ✓ |
| `jsonsyncclient` (br) | | | | ✓ | | | | ✓ |

---

## 3. Host state diagram

```mermaid
flowchart LR
  classDef main fill:#1e293b,stroke:#60a5fa,color:#e2e8f0
  classDef sim fill:#14532d,stroke:#4ade80,color:#e2e8f0
  classDef heavy fill:#4c1d95,stroke:#a78bfa,color:#e2e8f0
  classDef br fill:#7c2d12,stroke:#fb923c,color:#e2e8f0
  classDef peer fill:#450a0a,stroke:#f87171,color:#fef2f2

  subgraph MAIN["Main thread (browser) — userspace.ts"]
    direction TB
    H_REG[register]:::main
    H_GC[gadgetclient]:::main
    H_BR[bridge]:::main
    H_MDM[modem]:::main
    H_SYN[synth]:::main
    H_JSC[jsonsyncclient]:::main
    H_SW[SOFTWARE<br/>session]:::main
    H_FWD[forward<br/>postMessage hub]:::main
  end

  subgraph SIM["Sim worker — simspace.ts (HOST ONLY)"]
    direction TB
    S_VM[vm<br/>dispatches vm:*]:::sim
    S_CLK[clock<br/>emits ticktock / second]:::sim
    S_JSS[jsonsyncserver]:::sim
    S_USR[user]:::sim
    S_MDM[modem]:::sim
    S_GMP[gadgetmemoryprovider]:::sim
    S_FWD[forward]:::sim
  end

  subgraph HEAVY["Heavy worker — heavyspace.ts"]
    direction TB
    HV_H[heavy<br/>LLM / TTS / agents]:::heavy
    HV_FWD[forward]:::heavy
  end

  subgraph BR["Boardrunner worker — boardrunnerspace.ts"]
    direction TB
    B_BR[boardrunner<br/>ticks owned boards]:::br
    B_USR[user<br/>pilot input]:::br
    B_JSC[jsonsyncclient]:::br
    B_GMP[gadgetmemoryprovider]:::br
    B_FWD[forward]:::br
  end

  PEER[[PeerJS host listener<br/>netterminalhost]]:::peer

  %% Main thread local edges
  H_REG -->|vm:login / vm:operator / vm:doot| H_FWD
  H_REG -->|bridge:start / bridge:join| H_BR
  H_SW -->|chat / toast / log| H_GC
  H_GC -->|gadgetclient:paint/patch<br/>apply to React store| H_GC
  H_BR <-->|netterminal:cap / peergone| PEER

  %% Main -> Sim worker (postMessage)
  H_FWD -. vm / user / modem / jsonsyncserver<br/>gadgetclient / ackboardrunner .-> S_FWD
  S_FWD -. vm / user / heavy / synth / modem<br/>bridge / register / gadgetclient<br/>jsonsyncclient / boardrunner<br/>second / ticktock / log / chat .-> H_FWD

  %% Sim local edges
  S_CLK -->|ticktock / second| S_VM
  S_VM -->|operator / books / login<br/>peergone / playermovetoboard<br/>ackboardrunner …| S_VM
  S_VM -->|jsonsyncserver:clientpatch| S_JSS
  S_JSS -->|jsonsyncclient:snapshot<br/>serverpatch / antipatch| S_FWD
  S_USR -->|user:input handler| S_VM
  S_MDM -->|modem:join / sync / awareness| S_MDM
  S_GMP -->|gadgetstate flags| S_VM

  %% Main -> Heavy
  H_FWD -. heavy:* / second .-> HV_FWD
  HV_FWD -. heavy:* / acklook<br/>(no ticktock) .-> H_FWD

  %% Main -> Boardrunner
  H_FWD -. ticktock / second / user<br/>jsonsyncclient / boardrunner .-> B_FWD
  B_FWD -. boardrunner:ownedboards ack<br/>gadgetclient:paint/patch<br/>jsonsyncclient / desync .-> H_FWD

  %% Boardrunner internals
  B_BR -->|ticktock → runworkertick<br/>memorytickmain<br/>memoryworkerpushdirty| B_BR
  B_BR -->|boardrunner:desync / clearscroll| B_FWD
  B_USR -->|pilot user:input| B_BR
  B_JSC -->|jsonsync:changed| B_BR
  B_GMP -->|gadgetstate / dirty| B_BR

  %% Sim <-> Main: gadget ownership coordination
  S_VM -->|boardrunner:ownedboards| S_FWD
  S_FWD -. boardrunner:ownedboards .-> H_FWD
  H_FWD -. relayed .-> B_FWD
```

### Host-only facts
- `clock` lives only on sim ([`zss/device/clock.ts`](../clock.ts) 4–43). All `ticktock` originates here.
- `jsonsyncserver` is authoritative only on the host ([`zss/device/jsonsyncserver.ts`](../jsonsyncserver.ts) 118–197).
- Host bridge fans messages out **per remote player** if `message.player` is set ([`zss/feature/netterminal.ts`](../../feature/netterminal.ts)); player-targeted host→join traffic is **queued** until the host learns the joiner’s `message.player` from the first inbound message (avoids mis-delivery before handshake).

### 3.1 Per-frame order of operations (host)

Authoritative ordering for one sim frame (see also [`zss/device/vm/handlers/tick.ts`](../vm/handlers/tick.ts), [`zss/device/boardrunner.ts`](../boardrunner.ts)):

1. **Sim `clock`** emits `ticktock` into the sim worker hub.
2. **`vm` tick handler** runs `memorytickmain(…, loadersonly=true)` then **`memorysyncpushdirty`** so server jsonsync streams catch loader-side mutations.
3. **Board election** updates `boardrunners` / asks / revokes (same tick handler); **`boardrunner:ownedboards`** should reach the main hub and boardrunner worker **before** that worker’s next `ticktock` applies an authoritative `memorytickmain` for newly owned boards.
4. **Main hub** forwards `ticktock` / patches / ownership to the boardrunner worker (`allowticktock`) and to **PeerJS** per [`shouldforwardservertoclient`](../forward.ts) minus peer blocks.
5. **Boardrunner worker** on `ticktock`: pilot → full `memorytickmain` → gadget sync → `memoryworkerpushdirty` (client patches upstream).

**Barrier:** a worker should not treat a board as authoritative until it has received **`boardrunner:ownedboards`** for that board *and* a **`jsonsyncclient:snapshot`** (or equivalent hydrate) for the corresponding `board:*` stream; otherwise skip authoritative tick work for that board (handled via ownership set + hydrate in [`boardrunner.ts`](../boardrunner.ts)).

```mermaid
sequenceDiagram
  autonumber
  participant CLK as clock_sim
  participant VM as vm_sim
  participant JSS as jsonsyncserver
  participant FWD as forward_simToMain
  participant MAIN as mainHub
  participant BR as boardrunnerWorker
  participant PEER as PeerJS

  CLK->>VM: ticktock
  VM->>VM: memorytickmain_loadersOnly
  VM->>JSS: memorysyncpushdirty
  JSS-->>FWD: snapshot_serverpatch
  VM->>VM: boardrunner_election
  VM-->>FWD: boardrunner_ownedboards
  FWD-->>MAIN: postMessage
  MAIN-->>BR: ticktock_allow
  MAIN-->>PEER: serverToClient_minus_peerBlocks
  BR->>BR: runworkertick_fullTick_gadget_pushDirty
```

---

## 4. Join state diagram

```mermaid
flowchart LR
  classDef main fill:#1e293b,stroke:#60a5fa,color:#e2e8f0
  classDef stub fill:#3f3f46,stroke:#a1a1aa,color:#e2e8f0
  classDef heavy fill:#4c1d95,stroke:#a78bfa,color:#e2e8f0
  classDef br fill:#7c2d12,stroke:#fb923c,color:#e2e8f0
  classDef peer fill:#450a0a,stroke:#f87171,color:#fef2f2

  subgraph MAIN["Main thread (browser) — same userspace.ts"]
    direction TB
    J_REG[register]:::main
    J_GC[gadgetclient]:::main
    J_BR[bridge<br/>join mode]:::main
    J_MDM[modem]:::main
    J_SYN[synth]:::main
    J_JSC[jsonsyncclient]:::main
    J_SW[SOFTWARE]:::main
    J_FWD[forward]:::main
  end

  subgraph STUB["Stub worker — stubspace.ts (JOIN ONLY)"]
    direction TB
    ST_VM[vm<br/>operator → ackoperator ONLY]:::stub
    ST_FWD[forward<br/>forwards EVERYTHING]:::stub
  end

  subgraph HEAVY["Heavy worker — heavyspace.ts"]
    direction TB
    JHV_H[heavy]:::heavy
    JHV_FWD[forward]:::heavy
  end

  subgraph BR["Boardrunner worker — boardrunnerspace.ts"]
    direction TB
    JB_BR[boardrunner<br/>ticks owned boards<br/>if elected by host]:::br
    JB_USR[user]:::br
    JB_JSC[jsonsyncclient]:::br
    JB_GMP[gadgetmemoryprovider]:::br
    JB_FWD[forward]:::br
  end

  PEER[[PeerJS join connection<br/>netterminaljoin host topic]]:::peer

  %% Main local
  J_REG -->|on ackoperator → bridgejoin| J_BR
  J_BR <-->|netterminal:cap / peergone| PEER
  J_GC -->|gadgetclient:paint/patch| J_GC

  %% Main -> stub vm (local VM is a stub)
  J_FWD -. operator → ackoperator .-> ST_FWD
  ST_FWD -. ackoperator + anything<br/>allowticktock passes .-> J_FWD

  %% Main -> Heavy (unchanged)
  J_FWD -. heavy:* / second .-> JHV_FWD
  JHV_FWD -. heavy / acklook .-> J_FWD

  %% Main -> Boardrunner (unchanged)
  J_FWD -. ticktock local tick<br/>second / user<br/>jsonsyncclient / boardrunner .-> JB_FWD
  JB_FWD -. gadgetclient:paint/patch<br/>boardrunner:desync/clearscroll<br/>jsonsyncclient .-> J_FWD

  %% Boardrunner internals
  JB_BR -->|local ticktock from main?<br/>NO ticktock from peer| JB_BR
  JB_USR -->|pilot user:input| JB_BR
```

### Join-only facts
- Join replaces `simspace` with **`stubspace`** ([`zss/device/stub.ts`](../stub.ts) 9–26, [`zss/stubspace.ts`](../../stubspace.ts) 6–8). No `clock`, no `jsonsyncserver`, no sim `user`/`modem`, no full `vm` handlers.
- Join's `forward` has `allowticktock: true` so ticks can still reach the boardrunner, but **no** `ticktock` comes over PeerJS from the host (blocked by `shouldnotforwardonpeerserver` in [`zss/device/forward.ts`](../forward.ts)).
- Heavy + boardrunner workers still exist per-browser; a join player can be **elected** to run boards via `boardrunner:ownedboards` from the host VM.

### 4.1 Per-frame order of operations (join)

1. **No sim `clock`:** `ticktock` is produced on the **main thread** (same hub as `register` / `gadgetclient`) and forwarded into the boardrunner worker with `allowticktock: true` ([`zss/boardrunnerspace.ts`](../../boardrunnerspace.ts)).
2. **Stub `vm`** only answers `operator` → `ackoperator`; multiplayer state changes arrive as forwarded **`vm:*` acks** and **`jsonsyncclient:*`** from the host over PeerJS.
3. **`netterminal:cap`** carries `{ v: 1, host: <hostPlayerId> }` so the joiner can call **`vm:peergone`** with the correct host id on disconnect (not inferred from arbitrary first `message.player`).
4. **PeerJS** never carries `ticktock` host→join; join boardrunner still ticks from **local** main-thread `ticktock` only.

---

## 5. PeerJS wire between host and join

Transport: PeerJS `DataConnection` ([`zss/feature/netterminal.ts`](../../feature/netterminal.ts) 145–310). Payload is either legacy JSON-serializable `MESSAGE` or CBOR `netformat` v1 after the `netterminal:cap` handshake (125–143, 154–164).

```mermaid
flowchart LR
  classDef host fill:#14532d,stroke:#4ade80,color:#e2e8f0
  classDef join fill:#3f3f46,stroke:#a1a1aa,color:#e2e8f0
  classDef wire fill:#450a0a,stroke:#f87171,color:#fef2f2

  subgraph HOST_MAIN["HOST main thread"]
    HHUB[hub + forward]:::host
    HBRIDGE[bridge / netterminalhost]:::host
  end

  subgraph JOIN_MAIN["JOIN main thread"]
    JHUB[hub + forward]:::join
    JBRIDGE[bridge / netterminaljoin]:::join
  end

  WIRE{{PeerJS DataConnection<br/>CBOR netformat v1 after cap}}:::wire

  HBRIDGE <--> WIRE
  WIRE <--> JBRIDGE

  HHUB -->|shouldforwardservertoclient<br/>minus ticktock, ready, netterminal:cap| HBRIDGE
  JBRIDGE -->|delivered to join hub.invoke| JHUB

  JHUB -->|shouldforwardclienttoserver<br/>minus ticktock, second, netterminal:cap| JBRIDGE
  HBRIDGE -->|per-peer fan-out if message.player set<br/>delivered to host hub.invoke| HHUB
```

### Host → Join over PeerJS

From `shouldforwardservertoclient` ([`zss/device/forward.ts`](../forward.ts) 57–95) minus the peer blocks in `shouldnotforwardonpeerserver`:

| Category | Messages |
|---|---|
| Broadcast | `log`, `chat`, `toast`, `second` |
| VM acks | `vm:*` handler results, `ackboardrunner`, `playermovetoboard`, `peergone` |
| Gadget state | `gadgetclient:paint`, `gadgetclient:patch` (so joiner UI updates) |
| Sync | `jsonsyncclient:snapshot`, `jsonsyncclient:serverpatch`, `jsonsyncclient:antipatch` |
| Board ownership | `boardrunner:ownedboards`, `boardrunner:desync`, `boardrunner:clearscroll` |
| Peer routing | `user`, `synth`, `modem`, `bridge`, `register` sub-paths |
| Session | `netterminal:cap` (handshake only) |

**Blocked** host → join: `ticktock`, `ready`, `netterminal:cap` after handshake.

### Join → Host over PeerJS

From `shouldforwardclienttoserver` ([`zss/device/forward.ts`](../forward.ts) 109–137) minus `shouldnotforwardonpeerclient`:

| Category | Messages |
|---|---|
| VM input | `vm:operator`, `vm:login`, `vm:cli`, etc. |
| User | `user:input`, `user:pilotstart/stop/clear` |
| Modem | `modem:join`, `modem:sync`, `modem:awareness` |
| Authoritative sync | `jsonsyncserver:clientpatch`, `jsonsyncserver:needsnapshot` |
| Gadget echoes | `gadgetclient:paint`, `gadgetclient:patch` (elected boardrunner reporting up) |
| Board ack | `sync`, `desync`, `joinack`, `ackboardrunner` |

**Blocked** join → host: `ticktock`, `second`, `netterminal:cap`.

### Handshake and disconnect
- Host may send `netterminal:cap` with `{ v: 1 }` ([`netterminal.ts`](../../feature/netterminal.ts) 221–229).
- After cap is seen, wire format switches to **CBOR** (`netterminal.ts` 125–143, 273–282).
- Join learns remote `player` id from the first non-empty `message.player` (`netterminal.ts` 284–292).
- On disconnect the host emits `vmpeergone` for the departed player (`netterminal.ts` 249–254, [`zss/device/api.ts`](../api.ts) 991–997); the sim `vm` `peergone` handler fans it out.

---

## 6. Forwarding policies (the source of truth)

All inter-hub edges are gated by predicates in [`zss/device/forward.ts`](../forward.ts). Keep this table aligned with the source:

| Predicate | Used by | Approx. line range | Passes |
|---|---|:-:|---|
| `shouldforwardclienttoserver` | main → sim, join → host (PeerJS) | see `forward.ts` | `vm`, `user`, `modem`, `jsonsyncserver`, `gadgetclient`, paths `sync`, `desync`, `joinack`, `needsnapshot`, `ackboardrunner` (plus literal fast paths) |
| `shouldforwardservertoclient` | sim → main, host → join (PeerJS) | see `forward.ts` | `log`, `chat`, `ready`, `toast`, `second`, `ticktock`, routed `vm`, `user`, `heavy`, `synth`, `modem`, `bridge`, `register`, `gadgetclient`, `jsonsyncclient`, `boardrunner`, several `vm:*` ack paths |
| `shouldnotforwardonpeerserver` | host bridge | see `forward.ts` | Blocks `ready` / `ticktock` / `netterminal:cap` by **target leaf** (including e.g. `vm:ticktock`) |
| `shouldnotforwardonpeerclient` | join bridge | see `forward.ts` | Blocks `ticktock`, `second`, `ready`, `netterminal:cap` by leaf |
| `shouldforwardclienttoheavy` / `heavytoclient` | main ↔ heavy | see `forward.ts` | `second`, `ready`, `heavy`, `acklook`; heavy→main skips `ticktock` |
| `shouldforwardclienttoboardrunner` | main → boardrunner | see `forward.ts` | `ticktock`, `second`, `ready`, `user`, `jsonsyncclient`, `boardrunner` |
| `shouldforwardboardrunnertoclient` | boardrunner → main | see `forward.ts` | Same allowlist as `shouldforwardservertoclient` plus target `jsonsyncserver` (so `jsonsyncserver:clientpatch` / `needsnapshot` from `memoryworkerpushdirty` reach the sim's `jsonsyncserver`); blocks `jsonsync:changed`, `ticktock`, `second` |

### Representative targets (grouped by device prefix)

- **VM:** `vm:operator`, `vm:books`, `vm:login`, `vm:cli`, `vm:doot`, `vm:peergone`, `vm:playermovetoboard`, `vm:ackboardrunner`, … ([`zss/device/api.ts`](../api.ts) 896+).
- **Jsonsync:** `jsonsyncclient:snapshot`, `jsonsyncserver:clientpatch`, `jsonsyncclient:serverpatch`, local broadcast `jsonsync:changed` ([`api.ts`](../api.ts) 204–267).
- **Boardrunner:** `boardrunner:ownedboards`, `boardrunner:desync`, `boardrunner:clearscroll` ([`api.ts`](../api.ts) 175–191, 269–274); worker sees the stripped path `ownedboards` ([`boardrunner.ts`](../boardrunner.ts) 205).
- **Register:** `register:input`, `register:loginready`, … ([`api.ts`](../api.ts) 412+).
- **Bridge:** `bridge:start`, `bridge:join`, `bridge:fetch`, … ([`api.ts`](../api.ts) 87–156); handler sees stripped targets `start`, `join`, … in [`bridge.ts`](../bridge.ts) 207+.
- **User:** `user:input`, `user:pilotstart`, `user:pilotstop`, `user:pilotclear` ([`api.ts`](../api.ts) 1000+).
- **Modem:** `modem:join`, `modem:sync`, `modem:awareness` ([`modem.ts`](../modem.ts) 428+).
- **Gadget client:** `gadgetclient:paint`, `gadgetclient:patch` ([`api.ts`](../api.ts) 159–172) — explicitly forwarded to host so operator UI updates when a joiner's elected boardrunner paints ([`forward.ts`](../forward.ts) 115–120).

### Full VM handler registry

From [`zss/device/vm/handlers/registry.ts`](../vm/handlers/registry.ts) 48–90:

`operator`, `topic`, `admin`, `zsswords`, `books`, `page`, `search`, `logout`, `login`, `playertoken`, `local`, `doot`, `lastinputtouch`, `query`, `pullvarresult`, `codewatch`, `coderelease`, `clearscroll`, `halt`, `ticktock`, `second`, `ackboardrunner`, `playermovetoboard`, `peergone`, `makeitscroll`, `refscroll`, `gadgetscroll`, `readzipfilelist`, `fork`, `zztsearch`, `zztrandom`, `publish`, `flush`, `bookmarkscroll`, `editorbookmarkscroll`, `cli`, `clirepeatlast`, `restart`, `inspect`, `findany`, `loader`.

Default fallback: [`zss/device/vm/handlers/default.ts`](../vm/handlers/default.ts).

---

## 7. Notable host-vs-join deltas

| Concern | Host | Join |
|---|---|---|
| Platform worker | `simspace` (full VM + clock + jsonsyncserver) | `stubspace` (stub `vm` only) |
| `ticktock` source | `clock` in sim worker | Local main-thread tick (no peer ticktock) |
| `second` source | `clock` in sim worker, fans out to peers | Blocked from join → host over PeerJS |
| Authoritative state | Yes — `jsonsyncserver` + full `memory` | No — mirrors host snapshots via `jsonsyncclient` |
| `register` boot | Loads local storage / books | On `ackoperator` calls `bridgejoin(SOFTWARE, myplayerid, urlcontent)` ([`register.ts`](../register.ts) 342–349) |
| Multiplayer CLI | `#joincode` / `bridge:start` / `bridge:join` ([`firmware/cli/commands/multiplayer.ts`](../../firmware/cli/commands/multiplayer.ts), [`register.ts`](../register.ts) 375–376) | N/A (already joining via URL) |
| PeerJS role | `netterminalhost()` with sticky peer id + host topic ([`netterminal.ts`](../../feature/netterminal.ts) 516–534, 121–123) | `netterminaljoin(topic)` with own peer id ([`netterminal.ts`](../../feature/netterminal.ts) 537–546, 413–423) |
| Board election | Can elect itself or any joiner via `boardrunner:ownedboards` | Can be elected; runs boards in its own boardrunner worker |
| Gadget UI updates | Directly from own `gadgetclient:paint/patch` | Forwarded from host's `gadgetclient` stream over PeerJS |

---

## 8. Code reference index

- Device creation: [`zss/device.ts`](../../device.ts) 36–107
- Hub dispatch / tick batching: [`zss/hub.ts`](../../hub.ts) 44–70
- Worker spawning: [`zss/platform.ts`](../../platform.ts) 20–81
- Worker bundles: [`zss/simspace.ts`](../../simspace.ts), [`zss/stubspace.ts`](../../stubspace.ts), [`zss/heavyspace.ts`](../../heavyspace.ts), [`zss/boardrunnerspace.ts`](../../boardrunnerspace.ts)
- Forward policies (source of truth for every inter-hub edge): [`zss/device/forward.ts`](../forward.ts) 45–232
- PeerJS wire & host/join setup: [`zss/feature/netterminal.ts`](../../feature/netterminal.ts) 121–310, 413–546
- Host vs join decision: [`zss/feature/url.ts`](../../feature/url.ts) 19–21 (`isjoin`)
- VM handler registry (host): [`zss/device/vm/handlers/registry.ts`](../vm/handlers/registry.ts) 48–90
- Stub VM (join): [`zss/device/stub.ts`](../stub.ts) 9–26
- Board ownership flow: [`zss/device/api.ts`](../api.ts) 175–191, [`zss/device/boardrunner.ts`](../boardrunner.ts) 59–121, 138–268
