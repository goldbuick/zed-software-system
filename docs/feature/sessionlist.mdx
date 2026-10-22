---
title: Session list
description: Book-token PeerJS lister for active multiplayer sessions
---

# Session list

Lists active multiplayer sessions for the same book version, so players can soft-join each other from `#admin` or `#sessions`.

## Token

The book token (`BOOK.token`) is a PeerJS id: `sl_` plus a 20-character `createinfohash`. It is minted by `createsessionlisttoken()` in [`protocol.ts`](zss/feature/sessionlist/protocol.ts), when a book is created and on every code page add or delete. Each book version therefore has its own list. Legacy tokens (word plus digits) do not pass `issessionlistpeerid` and are ignored until the next page add or delete.

## Flow

1. The sim sends `bridge:sessionlisttoken` with the main book token (checked once per second in `handlesecond`, sent only when it changes).
2. The main-thread service ([`service.ts`](zss/feature/sessionlist/service.ts)) tries `new Peer(token)`.
   - `open`: this tab is the **lister**. It keeps the registry in memory and accepts up to 64 client DataConnections.
   - `unavailable-id`: someone else is the lister. This tab opens an anonymous Peer and connects to the token as a **client**.
3. Tabs hosting a non-hidden session (`#joincode` without the hidden flag, `#jointab`) register `{ topic, players }`. Clients repeat `register` every 30s; entries expire after 90s or when the connection closes.
4. The lister pushes `sessionlist:list` to every client on each change. Each tab forwards the list (minus its own topic) to the sim with `vm:sessionlist`, stored by [`zss/memory/sessionlist.ts`](zss/memory/sessionlist.ts).
5. `#admin` (last section, "active sessions") and `#sessions` render one `!@adminjoin <topic>` link per session. The `adminjoin` chip runs the existing soft join (`runjoinurldestination`).

## Failover and bounds

- When the lister goes away, every client re-claims after 0-3s of jitter. The first to get the id becomes the new lister; the rest connect to it.
- Retries back off up to 60s and stop after 8 attempts, logging an error each time.
- Claim and client connect each have a 20s timeout.
- Joined thin tabs (`/join/`) never run the service. A soft join calls `sessionlisthalt()`.

## Protocol

| Message | Sender | Payload |
|---|---|---|
| `sessionlist:register` | client | `topic`, `players` |
| `sessionlist:unregister` | client | none |
| `sessionlist:query` | client | none |
| `sessionlist:list` | lister | `sessions: { topic, players, updated }[]` |

## Limits

- The lister is whichever tab claimed first; it could hide or invent entries.
- PeerServer can hold a dead id for a few seconds after the lister closes; the jittered re-claim covers that.
- The admin scroll shows the list as of when it opened; reopen to refresh.
