# Design: join↔join PeerJS clique (prefer 1 hop)

**Status:** implemented  
**Goal:** Prefer one DataConnection hop for join→elected-join-runner traffic (`boardrunner:*`, `chip:*`). Keep the host star for session, memory, gadget, and **fallback** when a join edge is down.

## Topology

```text
JoinB <--star--> Host <--star--> JoinA
JoinB <--clique edge (prefer)--> JoinA
```

- Bring-up: login and play work on the **star** immediately.
- Upgrade: after host roster, joins form a clique (deterministic dial: lower `peerId` connects).
- Cap: **10 joins** max; host refuses additional join DataConnections.

## Routing (XOR)

For `boardrunner` / `chip` targets only (not `second` / `ready`):

1. Resolve focus player board → elected runner player → runner `peerId` (from `netterminal:runnmap` + `netterminal:peerroster`).
2. Runner is self → local hub only.
3. Runner is host or unknown → star.
4. Runner is another join and edge **open** → send on that edge only (**not** also star).
5. Runner is another join and edge **down** → star fallback.

## Messages

| Target | Direction | Payload |
|--------|-----------|---------|
| `netterminal:peerhello` | join → host | `{ player, peerid }` |
| `netterminal:peerroster` | host → joins | `[{ player, peerid }, ...]` |
| `netterminal:runnmap` | host sim → peers | `[runners, playerboards]` |

## Primary code

| Module | Role |
|--------|------|
| [`zss/feature/netterminalpeerclique.ts`](../../zss/feature/netterminalpeerclique.ts) | Dial order, join-edge allowlist, `resolvejoinroute` |
| [`zss/feature/netterminal.ts`](../../zss/feature/netterminal.ts) | Clique, bridges, roster |
| [`zss/device/vm/handlers/ticktock.ts`](../../zss/device/vm/handlers/ticktock.ts) | Emit runnmap on change |

## Non-goals

- TURN (host fallback covers failed ICE)
- Replacing host star
- Gadget/authority return-path latency
