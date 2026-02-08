# netterminal.ts

**Purpose**: Peer-to-peer network terminal using PeerJS. Host or join sessions; bridge messages between peers. Used for multiplayer terminal sharing.

## Dependencies

- `idb-keyval` — Peer ID persistence
- `peerjs` — Peer, DataConnection
- `zss/device/api` — MESSAGE, apierror, apilog, vmsearch, vmtopic
- `zss/device/forward` — createforward, shouldforward helpers
- `zss/device/register` — registerreadplayer
- `zss/device/session` — SOFTWARE
- `zss/mapping/func` — doasync
- `zss/mapping/guid` — createinfohash
- `zss/mapping/types` — MAYBE, ispresent

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `readsubscribetopic` | — | Read current subscribed topic (peer ID) |
| `netterminalhost` | — | Host a new network terminal session; generates/loads peer ID |
| `netterminaljoin` | `topicpeerid` | Join existing session by peer ID |
| `netterminalhalt` | — | Disconnect and halt network terminal |

## Flow

- Peer ID stored in IndexedDB (`netid`)
- Host creates Peer, subscribes to topic; joins create DataConnection to host
- `createforward` bridges messages between device and peer; filters by `shouldforwardservertoclient`, `shouldnotforwardonpeerserver`
