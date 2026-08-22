# Media queue (cafe)

Receive path for the **Zed Cafe Media Queue** Electron helper. Each helper owns its own FIFO and per-player limit on disk; cafe CLI is RPC over a DataConnection to that helper.

| Module                                                                                            | Role                                                                                                                           |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [`protocol.ts`](../protocol.ts)                                                                   | DataConnection message types (`add` / `skip` / `clear` / `setlimit` / `approve` / `reject` / `queuesnapshot`)                  |
| [`queue.ts`](../queue.ts)                                                                         | Per-helper snapshot projection (`#media` table, `#queue` menu for the current board's helper)                                  |
| [`listenstate.ts`](../listenstate.ts)                                                             | Host board→helper map and per-helper DataConnection readiness                                                                  |
| [`playlistcopy.ts`](../playlistcopy.ts)                                                           | Clipboard `submittedAt title url` lines for `#media playlist`                                                                  |
| [`urlnormalize.ts`](../urlnormalize.ts)                                                           | Dedupe keys for queue URLs (cafe submit path still normalizes for chat shortcuts)                                              |
| [`mediaguards.ts`](../mediaguards.ts)                                                             | Submit vs manage permission checks                                                                                             |
| [`mediamenu.ts`](../mediamenu.ts) / [`queuemenu.ts`](../queuemenu.ts) / [`panel.ts`](../panel.ts) | `#media` / `#queue` CLI + bridge actions (RPCs after bind)                                                                     |
| [`playerconnect.ts`](../playerconnect.ts)                                                         | Direct helper `MediaConnection`; leave board disconnects, return reconnects while still bound; dead ICE tears down and redials |
| [`broadcastaudio.ts`](../broadcastaudio.ts)                                                       | Mix board TV audio into `#broadcast` compositor (same board only)                                                              |
| [`roompeers.ts`](../roompeers.ts)                                                                 | Board players -> clique peer ids (legacy tests)                                                                                |
| [`callmetadata.ts`](../callmetadata.ts)                                                           | `player` MediaConnection metadata                                                                                              |
| [`sinkregistry.ts`](../sinkregistry.ts) / [`attachvideo.ts`](../attachvideo.ts)                   | Stream to `useMedia.screen`                                                                                                    |
| [`boardtvvisible.ts`](../boardtvvisible.ts)                                                       | Board TV show gate (gadget board + video)                                                                                      |

## Permissions

| Action                                            | Who                | Permission               |
| ------------------------------------------------- | ------------------ | ------------------------ |
| `#media`, `#media <url>`, `#media playlist`       | Players (creative) | `speaker` (`media`)      |
| `#queue`, `#queue` bind, skip, clear, stop, limit, approve, reject | Admin / mod        | `bridge` (`mediamanage`) |

`#media` / `#media <url>` use the helper painted on the **player's current board** (`mediaqueuehelperpeerid`). Other boards have no queue until bound: host and join players off a bound board cannot list or submit for that board. `#media <url>` also needs the host DataConnection to that board's helper (`#queue <peerid>` on that board first). Queue is FIFO autoplay on the helper: finished items are removed; failures auto-skip. Media with unknown duration or longer than 10 minutes waits on the `#queue` needs-approval list until an admin approves (then downloads without the duration filter) or rejects.

### Multi-board / multi-helper

- The same helper peer id may be bound to **many boards** (`#queue <peerid>` on each board while standing there).
- Different boards may use **different** helpers at once; the host keeps one DataConnection per helper peer id.
- `#queue <other-peerid>` on an already-bound board **replaces** that board's helper only.
- `#queue stop` **unbinds the current board** only. When that was the last bound board, the host closes remaining helper connections and clears listen state.
- Leave-board hang-up is unchanged: leaving a bound board disconnects the local MediaConnection; returning reconnects while that board is still bound.
- Admin RPCs (`skip` / `clear` / `limit` / ...) and `#media` menus always target the helper for the **current** board.

A signaling drop on `terminal.zed.cafe` should resume the control plane and player calls without running `#queue` again; playback in the helper window keeps going.

## Commands

| Command            | Role                                                                                                                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `#media`           | Queue list on the player's current board (fails if that board has no helper); Copy URLs copies played + current lines to the clipboard |
| `#media <url>`     | Submit URL to the helper on the player's current board; toast `media requested` on send, toast `media added` when the helper accepts, then workstatus overlay tracks probe/download/process until playing |
| `#media playlist`  | Copy played then current queue as `submittedAt title url` lines (host clipboard)                                                                                                                                        |
| bare chat URL      | Pasting a whole-message allowlisted http(s) URL is equivalent to `#media <url>` (speaker required; see `mediaischatqueueurl`). Join submits are handled on the host helper tab (`bridge:mediapanel` is not forwarded). |
| `#queue`           | Admin: control menu for the current board's helper (skip / clear / stop links + limit line + pending approve/reject)                                                                                                                                  |
| `#queue <peerid>`  | Admin: bind (or replace) helper on current board                                                                                                                                                                                    |
| `#queue skip`      | Admin: skip current item on this board's helper (RPC)                                                                                                                                                                                         |
| `#queue clear`     | Admin: stop playback + empty queue on this board's helper (helper stays up)                                                                                                                                                                   |
| `#queue stop`      | Admin: unbind helper from the current board (full stop when it was the last bound board)                                                                                                                                                                                               |
| `#queue limit <N>` | Admin: set per-player cap (1-50) on this board's helper                                                                                                                                                                         |
| `#queue approve <N>` | Admin: allow a pending over-10-minute (or unknown duration) URL into the FIFO                                                                                                                                        |
| `#queue reject <N>`  | Admin: drop a pending URL                                                                                                                                                                                              |

CLI registration: [`media.ts`](../../../firmware/cli/commands/media.ts), [`queue.ts`](../../../firmware/cli/commands/queue.ts). Board sink: [`boardtvsink.tsx`](../../../gadget/boardtvsink.tsx).

Design: [`ops/docs/local-media-helpers-tauri.mdx`](../../../../ops/docs/local-media-helpers-tauri.mdx)
