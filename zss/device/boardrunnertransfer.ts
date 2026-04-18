/*
boardrunnertransfer: worker-side installer for the cross-board player
handoff hook defined in `zss/memory/playermanagement`.

Phase 3 of the boardrunner authoritative-tick plan. The elected runner is
admitted writable only to its owned board streams. When the firmware tries
to move a player across an edge into a board that belongs to another
runner, the default in-process mutation would flip a dirty bit the worker
cannot legally push (server rejects `unknownclient`). We intercept those
calls here:

1. Detect cross-ownership (no local hydration of the destination board, or
   we aren't admitted writable to `board:<toboardid>`).
2. Emit `vm:boardrunnertransfer` upstream with the full element, so the
   server can mediate the insert on the destination board.
3. Remove the element from the local source board so the source-stream
   clientpatch in this tick has the element gone.
4. Leave destination mutation to the server; runner B will pick up the
   element after the next hydration poke.

When the destination IS locally hydrated (single-peer / self-owned), the
hook returns false so `memorymoveplayertoboard` falls through to the
default in-process path.
*/
import { createdevice } from 'zss/device'
import { vmboardrunnertransfer } from 'zss/device/api'
import {
  jsonsyncclientreadownplayer,
  jsonsyncclientreadstream,
} from 'zss/device/jsonsyncclient'
import { ispresent } from 'zss/mapping/types'
import { memorydeleteboardobjectnamedlookup } from 'zss/memory/boardlookup'
import { memorywritebookflag } from 'zss/memory/bookoperations'
import { boardstreamid, memorymarkboarddirty } from 'zss/memory/memorydirty'
import { memorysetmoveplayerhook } from 'zss/memory/playermanagement'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'

const boardrunnertransfer = createdevice('boardrunnertransfer', [], () => {})

memorysetmoveplayerhook(({ player, fromboard, toboardid, element, dest }) => {
  // The worker is admitted writable to a board stream when the jsonsync
  // client has a local stream for `board:<toboardid>`. If we are, fall
  // through to the default in-process move (single-peer / self-owned).
  const deststreamid = boardstreamid(toboardid)
  const admitteddest = ispresent(jsonsyncclientreadstream(deststreamid))
  if (admitteddest) {
    return false
  }

  // Cross-ownership: emit transfer upstream so the server inserts on the
  // destination board. Stamp the envelope player with our own captured
  // identity so the server can validate `ackboardrunners[fromboardid]
  // === message.player`.
  const own = jsonsyncclientreadownplayer()
  vmboardrunnertransfer(boardrunnertransfer, own, {
    player,
    fromboardid: fromboard.id,
    toboardid,
    element: { ...element },
    dest: { x: dest.x, y: dest.y },
  })

  // Remove the element from the source board locally. This flips the
  // board:<fromboardid> dirty bit; the worker's next push emits a
  // clientpatch that removes the element from the source stream. We do
  // NOT touch the destination board here: that stream is owned by
  // another runner, and the server-side handler will insert it and poke
  // runner B on the next tick.
  if (element.id) {
    memorydeleteboardobjectnamedlookup(fromboard, element)
    delete fromboard.objects[element.id]
    memorymarkboarddirty(fromboard)
  }

  // Update our local view of the player's board. Without this, the
  // worker keeps reporting the OLD fromboardid in its memory-stream
  // projection; when that clientedit arrives at the server it races
  // with the server's authoritative `flags[player].board = toboardid`
  // write inside the transfer handler, and the server's silent
  // reverse-projection clobbers its own value. By aligning the local
  // flag here, subsequent worker memory pushes carry the new board and
  // the source runner stops painting stale state for this player.
  //
  // IMPORTANT: we only write the `board` flag, NOT activelist. The
  // standard memorywritebookplayerboard helper also manipulates the
  // book's activelist, and because the worker cannot resolve the
  // destination board locally (the destination codepage is not admitted
  // to this worker's jsonsync streams), it would remove the player from
  // activelist. That empty activelist would then clobber the server's
  // authoritative activelist via reverse-projection, leaving the server
  // election loop with no candidates and no runner ever admitted to the
  // destination board. activelist is server-authoritative; the server's
  // transfer handler keeps it correct via its own
  // memorywritebookplayerboard call.
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  memorywritebookflag(mainbook, player, 'board', toboardid)

  return true
})

export { boardrunnertransfer }
