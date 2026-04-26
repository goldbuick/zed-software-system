# Device Message Flow Diagram

The **hub** is a pub/sub fan-out: every `emit` is delivered to every connected device. Each device filters by **topics** (broadcast) or **directed target** (e.g. `vm:operator`).

**See also:** [devices-and-messaging.md](devices-and-messaging.md) — inventory of every device, three-realm topology, and cross-realm forwarding. **Gadget + memory replication:** elected **boardrunner** workers and **rxrepl** (`stream_row`, `gadget_row`, `push_batch`) — [host-vs-join-architecture.md](./host-vs-join-architecture.md).

## Mermaid diagram

```mermaid
flowchart TB
    subgraph Hub["HUB (fan-out to all devices)"]
        invoke["invoke(message)"]
    end

    subgraph Broadcast["Broadcast sources"]
        Clock["clock: ticktock, second"]
        VM["vm: ready"]
    end

    subgraph Core["Core devices"]
        VM2["VM (ticktock, second)"]
        Register["register (ready, second, log, chat, toast)"]
    end

    subgraph Display["Display pipeline"]
        GadgetClient["gadgetclient"]
    end

    subgraph Heavy["Heavy / agents"]
        HeavyDev["heavy"]
        Agent["agent_* (second)"]
    end

    Clock -->|ticktock| invoke
    Clock -->|second| invoke
    VM -->|ready| invoke

    invoke --> VM2
    invoke --> Register
    invoke --> GadgetClient
    invoke --> HeavyDev

    Register -->|vm:operator, vm:login, vm:loader...| VM2
    VM2 -->|replynext ackoperator, acklogin...| Register
    VM2 -->|heavy:ttsinfo, heavy:modelprompt| HeavyDev

    VM2 -.->|gadgetclient paint/patch<br/>(via forward to main)| GadgetClient

    Clock -->|ticktock| VM2
```

```
                    ┌─────────────────────────────────────────────────────────────┐
                    │                          HUB                                 │
                    │  invoke(message) → every device.handle(message)              │
                    └─────────────────────────────────────────────────────────────┘
                                              │
           ┌──────────────────────────────────┼──────────────────────────────────┐
           │                                  │                                  │
           ▼                                  ▼                                  ▼
    ┌──────────────┐                  ┌──────────────┐                  ┌──────────────┐
    │    CLOCK     │                  │     VM       │                  │   REGISTER   │
    │  (no topics) │                  │ ticktock     │                  │ ready,second │
    │              │                  │ second       │                  │ log,chat,    │
    │emit:ticktock │─────────────────►│              │                  │ toast        │
    │ emit: second │─────────────────►│              │◄─────────────────│              │
    └──────────────┘                  │              │  vm:operator     │ vmoperator() │
           │                          │              │  vm:login, etc   │ vmcli()      │
           │ticktock                   │ replynext    │                  │ vmlogin()   │
           ▼                          │ ackoperator  │─────────────────►│ etc         │
                            ┌─────────┴──────────────┴──────────────────────────────┐
                            │  GADGETCLIENT (main): paint/patch from vm / peers     │
                            │  Boardrunner + rxrepl drive gadget + memory streams    │
                            └────────────────────────────────────────────────────────┘
```

## Boot sequence

```
  simspace/stubspace
        │
        │ setTimeout(started, 100)
        ▼
  ┌─────────────┐
  │ vm.started()│  (or stub.started())
  │             │
  │ platform-   │
  │ ready(vm)   │
  └──────┬──────┘
         │ emit('', 'ready')  ← broadcast, no player
         ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │ HUB.invoke(message{ target:'ready', sender:vm_id })               │
  │ → every device.handle(message)                                    │
  └──────────────────────────────────────────────────────────────────┘
         │
         ├──► REGISTER (topic 'ready')
         │         │
         │         │ storagewatch, history, apilog, vmoperator(register, player)
         │         │
         │         ▼
         │    vm.emit(player, 'vm:operator')  ← directed to VM
         │         │
         │         ▼
         │    VM (match iname=vm, target→'operator')
         │         │ memorywriteoperator(player)
         │         │ vm.replynext(message, 'ackoperator', true)
         │         │
         │         ▼
         │    register.emit(player, 'register:ackoperator')  ← reply to register
         │         │
         │         ▼
         │    REGISTER (match iname=register, target→'ackoperator')
         │         │ loadmem(urlcontent) or bridgejoin()
         │         │
         │         ▼
         │    vmloader(..., 'sim:load', '')
         │         │
         │         ▼
         │    VM handles loader → memory, boards, etc.
         │
         ├──► Every device: session capture (if !session && target='ready')
         │
         └──► (other devices ignore or handle lightly)
```

## Main message flows

| From      | To         | Target               | Purpose                         |
|-----------|------------|----------------------|---------------------------------|
| vm/stub   | all        | `ready`              | Boot signal, session capture    |
| clock     | vm         | `ticktock`           | Game loop tick                  |
| clock     | all        | `second`             | Keepalive, agent doot            |
| register  | vm         | `vm:operator`        | Set operator player             |
| register  | vm         | `vm:login`           | Player login                    |
| register  | vm         | `vm:loader`          | Load books/content              |
| register  | vm         | `vm:cli`             | CLI command                     |
| UI        | user       | `user:input`         | Keyboard/gamepad input (fanout: server + boardrunner) |
| UI        | user       | `user:pilotstart`    | Start pilot navigation (boardrunner) |
| UI        | user       | `user:pilotstop`     | Stop pilot navigation (boardrunner)  |
| heavy     | user       | `user:pilotclear`    | Clear pilot for agent (boardrunner)  |
| vm        | register   | `register:ackoperator`| Operator set ack                |
| vm        | register   | `register:loginready` | Login result / logout ack      |
| vm        | register   | `register:acklogin`  | Login success/failure           |
| vm        | heavy      | `heavy:ttsinfo`      | TTS info request               |
| vm        | heavy      | `heavy:ttsrequest`   | TTS audio request               |
| vm        | heavy      | `heavy:modelprompt`  | Serialized classify then optional full agent LLM |
| sim / peers | gadgetclient | `gadgetclient:paint` / `patch` | UI gadget state (from vm path, boardrunner, or PeerJS) |
| boardrunner / vm | rxreplserver | `rxreplserver:push_batch` | Merge memory / board / gadget rows on host sim |
| sim       | rxreplclient | `rxreplclient:stream_row` / `gadget_row` | Full-document replication to clients |
| agents    | vm         | `vm:doot`            | Agent keepalive                 |

## Device summary

| Device       | Topics               | Receives (directed)      | Role                          |
|--------------|----------------------|--------------------------|-------------------------------|
| clock        | (none)               | —                        | Emits ticktock, second        |
| vm           | ticktock, second     | vm:*                     | Game logic, login, CLI, loader|
| register     | ready, second, log, chat, toast | register:* | UI state, storage, bootstrap |
| gadgetclient | (none)               | gadgetclient:*            | Receives paint/patch from api |
| rxreplclient | (none)               | rxreplclient:*            | Stream + gadget rows; emits `jsonsync:changed` |
| rxreplserver | (none)               | push_batch                | Sim-side merge into MEMORY (sim worker) |
| rxstreamreplserver | (none)           | (memorysync calls)        | Authoritative memory/board streams (sim) |
| heavy        | (none)               | heavy:*                  | TTS, LLM (lazy-loaded)        |
| bridge       | (none)               | bridge:*                  | Multiplayer / BBS             |
| modem        | second               | modem:*                   | CRDT sync, presence           |
| synth        | (none)               | synth:*                   | Audio playback                |
| userinput    | (none)               | userinput:*               | Input up/down from UI         |
| forward      | all                  | —                        | Peer sync (worker↔main)       |
| agent_*      | second               | —                        | Per-agent device, doot to vm  |

## Routing rules (device.handle)

1. **Session capture**: First `ready` message sets device session (broadcast).
2. **Topic match**: `target` in topics (e.g. `second`) OR `path` when broadcast (e.g. `ready` → path).
3. **Directed match**: `iname === target` (e.g. `vm:operator` → vm receives with target=`operator`).
4. **reply(to, target)**: Emits `to.sender:target` so the original sender receives.
5. **replynext**: Same as reply but delayed 64ms (for ordering).
