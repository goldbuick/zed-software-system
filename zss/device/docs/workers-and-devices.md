# Workers and devices

Quick reference: which **routing names** (`createdevice` first argument) live in each **realm**. For host vs join and message forwarding, see [host-vs-join-architecture.md](./host-vs-join-architecture.md).

---

## Web main (browser main thread)

Loaded from [`zss/userspace.ts`](../../userspace.ts) (UI) and [`zss/platform.ts`](../../platform.ts) (worker bridge + `forward`).

| Device | Source file | Notes |
|--------|-------------|--------|
| **`register`** | [`zss/device/register.ts`](../../device/register.ts) | Bootstrap: storage, terminal, `vm:*`, login, multiplayer branch. |
| `gadgetclient` | [`zss/device/gadgetclient.ts`](../../device/gadgetclient.ts) | Gadget `paint` / `patch` → React state. |
| `bridge` | [`zss/device/bridge.ts`](../../device/bridge.ts) | PeerJS, join URL, IVS, chat. |
| `modem` | [`zss/device/modem.ts`](../../device/modem.ts) | Yjs doc + awareness (main instance). |
| `synth` | [`zss/device/synth.ts`](../../device/synth.ts) | Web Audio / TTS. |
| `rxreplclient` | [`zss/device/rxreplclient.ts`](../../device/rxreplclient.ts) | Client repl: stream mirror, `push_batch`, jsonsync. |
| `SOFTWARE` | [`zss/device/session.ts`](../../device/session.ts) | Session singleton / emit target. |
| `forward` | [`zss/platform.ts`](../../platform.ts) | `postMessage` ↔ main hub ([`zss/device/forward.ts`](../../device/forward.ts)). |

---

## Sim worker (`simspace`)

Entry: [`zss/simspace.ts`](../../simspace.ts). Host only (`new simspace()` from [`zss/platform.ts`](../../platform.ts) when not join stub).

Side-effect imports register these devices on the worker hub:

| Device | Source file | Notes |
|--------|-------------|--------|
| `vm` | [`zss/device/vm.ts`](../../device/vm.ts) | Full VM; `ticktock` / `second` + handler registry. |
| `user` | [`zss/device/vm.ts`](../../device/vm.ts) | Sim-side `user:input` (`handleuserinput`). |
| `clock` | [`zss/device/clock.ts`](../../device/clock.ts) | `ticktock` / `second`. |
| `streamreplserver` | [`zss/device/streamreplserver.ts`](../../device/streamreplserver.ts) | Authoritative `memory` / `board:*` streams. |
| `rxreplserver` | [`zss/device/rxreplserver.ts`](../../device/rxreplserver.ts) | `push_batch` → `memorysyncreverseproject`. |
| `modem` | [`zss/device/modem.ts`](../../device/modem.ts) | Worker copy of Yjs protocol. |
| `gadgetmemoryprovider` | [`zss/device/gadgetmemoryprovider.ts`](../../device/gadgetmemoryprovider.ts) | Sim gadget store from MEMORY. |
| `forward` | [`zss/simspace.ts`](../../simspace.ts) | Forwards to main when `shouldforwardservertoclient`. |

---

## Stub worker (`stubspace`)

Entry: [`zss/stubspace.ts`](../../stubspace.ts). Join client only (URL `/join/` → stub instead of sim).

| Device | Source file | Notes |
|--------|-------------|--------|
| `vm` | [`zss/device/stub.ts`](../../device/stub.ts) | Minimal VM (`operator` → `ackoperator` only). |
| `forward` | [`zss/stubspace.ts`](../../stubspace.ts) | Forwards **all** messages to parent (no server filter). |

---

## Heavy worker (`heavyspace`)

Entry: [`zss/heavyspace.ts`](../../heavyspace.ts).

| Device | Source file | Notes |
|--------|-------------|--------|
| `heavy` | [`zss/device/heavy.ts`](../../device/heavy.ts) | LLM / TTS / agents (`modelprompt`, `ttsrequest`, etc.). |
| `forward` | [`zss/heavyspace.ts`](../../heavyspace.ts) | Forwards when `shouldforwardheavytoclient`. |

---

## Boardrunner worker (`boardrunnerspace`)

Entry: [`zss/boardrunnerspace.ts`](../../boardrunnerspace.ts).

| Device | Source file | Notes |
|--------|-------------|--------|
| `boardrunner` | [`zss/device/boardrunner.ts`](../../device/boardrunner.ts) | Owned-board tick; hydrates `memory` / `board:*` / `flags:*` changes. |
| `user` | [`zss/device/boardrunner.ts`](../../device/boardrunner.ts) | Worker `user:input` → `inputqueue`; pilot routing. |
| `rxreplclient` | [`zss/device/rxreplclient.ts`](../../device/rxreplclient.ts) | Same module as main; worker-local stream map. |
| `gadgetmemoryprovider` | [`zss/device/gadgetmemoryprovider.ts`](../../device/gadgetmemoryprovider.ts) | Worker gadget store + dirty marking. |
| `forward` | [`zss/boardrunnerspace.ts`](../../boardrunnerspace.ts) | To main; `allowticktock: true` so clock reaches worker. |

---

## Worker creation order (host)

From [`zss/platform.ts`](../../platform.ts) `createplatform()`:

1. **Heavy** worker (`heavyspace`)
2. **Boardrunner** worker (`boardrunnerspace`)
3. **Platform** worker — **sim** (`simspace`) or **stub** (`stubspace`)

All four **realms** (main + three workers) also run a **`forward`** device that implements the `postMessage` bridge policy.
