# realmbus

Implementation plan: replace postMessage and PeerJS-first multiplayer with one global **BroadcastChannel** (`zss-realm`) carrying **`MESSAGE`** objects only. **`topic` is always set** on every emit — sourced from **netterminal netid** (`createinfohash(netid || player)`), never empty.

| Concept | Name |
|---------|------|
| BC channel | `REALMBUS_CHANNEL = 'zss-realm'` |
| Topic source | **`readnettopic()`** — `createinfohash` of sticky IDB **`netid`**, fallback **`player`** (`netterminalhost` same path) |
| Transport | `zss/feature/realmbus.ts` |
| Coordination device | `zss/device/realmbus.ts` on **main** hub |
| Unified inbound | **`realmbusdeliver(message)`** — BC + Peer decode |
| Subscriptions | **`istopicsubscribed(topic)`** — own nettopic + host topic when joined |

## Goal

Replace **postMessage** (`platform.ts`) and **PeerJS-first** multiplayer (`netterminal.ts`). PeerJS fallback when no BC host within **1.5s**.

## Decisions

| Decision | Choice |
|----------|--------|
| **`MESSAGE.topic`** | **Required, never empty** — always `readnettopic()` on emit |
| Topic identity | **netid → createinfohash** (same as netterminal; `storagereadnetid`, fallback player) |
| Intra-tab filter | **`message.session === local tab session`** |
| Cross-tab filter | **`message.session !== local session`** and **`istopicsubscribed(message.topic)`** |
| Session bridge | **`realmbusdeliver`** rewrites session to local tab session on cross-tab |
| Multiplayer join | Join tab **subscribes** to host topic (URL hash); still emits with own nettopic for local traffic |
| Coordination | `realmbus:topic`, `hostready`, `joinhello`, `joinack`, `halt` |
| Worker boot | Constructor args (`climode`, `hostmemtrace`, `topic`) |
| Peer wire | Keep msgpack+zstd |
| BC | Required |

## `MESSAGE.topic` — netid always

Every tab has a **stable nettopic** from netterminal's netid story:

```typescript
async function readnettopic(): Promise<string> {
  const netid = (await storagereadnetid()) ?? registerreadplayer() ?? ''
  return createinfohash(netid)
}
```

| When | `message.topic` | Subscribed topics |
|------|-----------------|-------------------|
| **Solo tab** | Own `readnettopic()` | `[own nettopic]` |
| **Host** (`#joincode`) | Own nettopic (= `subscribetopic`) | `[own nettopic]` |
| **Join tab** | Own nettopic on local emits | `[own nettopic, host hash topic]` |

- **`subscribetopic`** in netterminal becomes the same value as host **`readnettopic()`** when hosting.
- **`vmtopic` / `memorywritetopic`** stay in sync when topic changes.
- Hub **`emit`** / **`createmessage`** stamp **`topic: readnettopicsync()`** on every message.

## Delivery rules (`realmbusdeliver`)

Session first — local tab always wins:

| Case | Condition | Action |
|------|-----------|--------|
| **Intra-tab** | `message.session === SOFTWARE.session()` | `forward(message)` |
| **Cross-tab** | `message.session !== SOFTWARE.session()` and `istopicsubscribed(message.topic)` | `forward({ ...message, session: SOFTWARE.session() })` |
| **Ignore** | otherwise | drop |

```typescript
function realmbusdeliver(message: MESSAGE) {
  if (message.session === SOFTWARE.session()) {
    forward(message)
    return
  }
  if (istopicsubscribed(message.topic)) {
    forward({ ...message, session: SOFTWARE.session() })
  }
}
```

Replaces inline session rewrite in `netterminal.ts`. Peer decode calls **`realmbusdeliver`**.

## Outbound (replaces postMessage)

- **`createforward`** outbound → **`realmbussend(message)`** (topic already on message from emit).
- **`createtopicbridge`**: peer-eligible outbound uses **`topic = host nettopic`**; apply `shouldforwardonpeer*`.
- Inbound: **`shouldacceptrealmbus(message, realm)`** + existing `shouldforward*` matrix.

## Coordination (`realmbus` device)

Main hub only.

| Target | Purpose |
|--------|---------|
| `realmbus:topic` | Push new nettopic to all realms in tab (`data: { topic }`) |
| `realmbus:hostready` | Join discovers BC host |
| `realmbus:joinhello` | Join presence |
| `realmbus:joinack` | Host ack |
| `realmbus:halt` | Teardown |

**Join discovery:** wait for `realmbus:hostready` where **`message.topic === host hash from URL`** (1.5s), then `joinhello`.

## Worker topic propagation

Workers cache topic in **`readnettopicsync()`** (module-level, per realm).

### 1. Boot — constructor arg from main

```typescript
const topic = await readnettopic()
heavy = new heavyspace({ name: 'heavy', climode, hostmemtrace, topic })
boardrunner = new boardrunnerspace({ name: 'boardrunner', climode, hostmemtrace, topic })
platform = new simspace({ name: 'sim', climode, hostmemtrace, topic })
```

Each worker entry calls **`initrealmbus(realm, topic)`**.

### 2. Updates — `realmbus:topic` on the BC (same tab)

When netid / topic changes:

1. Main: `await readnettopic()` → **`realmbussettopic(topic)`**
2. Emit **`realmbus:topic`** on BC
3. Every realm in tab calls **`realmbussettopic(topic)`**
4. Sim also: `vmtopic` → `memorywritetopic`

### 3. Emit stamping — hub in each realm

`hub.emit` / `createmessage` attach **`topic: readnettopicsync()`** in each realm.

**Join tab:** `topicsubscribe(hostHashFromUrl)` on `bridgejoin`.

## Implementation phases

### Phase 0 — MESSAGE.topic + readnettopic

- Extend `MESSAGE` with required **`topic: string`**
- `readnettopic()`, `readnettopicsync()`, `realmbussettopic()`, `topicsubscribe()`, `istopicsubscribed()`
- Stamp topic in `createmessage` / `hub.emit`
- Boot: main `await readnettopic()` before spawning workers

### Phase 1 — Core bus

- `realmbus.ts`, wire all realms, constructor boot

### Phase 2 — Netterminal

- `realmbus` device, createtopicbridge, BC-first, halt

### Phase 3 — Docs

- Update `devices-and-messaging.md`, `netterminal.md`

## Implementation todos

- [ ] Add topic to MESSAGE; readnettopic(); stamp on hub emit; sync vmtopic/memorywritetopic
- [ ] Add realmbus.ts transport + realmbus device; BC required
- [ ] Replace postMessage in platform.ts + workers; worker init with topic
- [ ] Unit tests: session-first delivery, subscribe bridge, inbound matrix, dedup
- [ ] createtopicbridge; hostready/joinhello/joinack/halt
- [ ] BC-first 1.5s timeout then PeerJS; realmbusdeliver on Peer inbound; netterminalhalt
- [ ] joinmove E2E asserts BC transport
- [ ] Update architecture docs

## Files

| File | Change |
|------|--------|
| `zss/device/api.ts` | `MESSAGE.topic`; realmbus helpers |
| `zss/feature/netterminal.ts` | readnettopic(); createtopicbridge; realmbusdeliver |
| **New** `zss/feature/realmbus.ts` | BC transport, subscriptions, deliver |
| **New** `zss/device/realmbus.ts` | Coordination device |
| `zss/hub.ts` / `zss/device.ts` | Stamp topic on emit |
| `zss/platform.ts` | initrealmbus; netid boot; worker args |
| Worker entries | realmbus wiring |
| Docs | devices-and-messaging, netterminal |
