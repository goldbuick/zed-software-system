import {
  streamreplserverdropplayer,
  streamreplserverdropplayerfromallstreams,
  streamreplserverensureplayeradmitted,
  streamreplserverreadstream,
  streamreplserverregister,
  streamreplserverupdate,
} from 'zss/device/streamreplserver'
import { ispresent, isstring } from 'zss/mapping/types'
import {
  memorycollectchipmemidsforboard,
  memorytrackingflagsbagid,
} from 'zss/memory/boardchipflags'
import { memoryreadcodepagebyid } from 'zss/memory/codepages'
import {
  boardstream,
  flagsstream,
  gadgetstream,
  isboardstream,
  ischipflagsstream,
  isflagsstream,
  isgadgetstream,
  ismemorystream,
  memoryconsumealldirty,
  memorymarkdirty,
  memorystream,
  playerfromflagsstream,
  playerfromgadgetstream,
} from 'zss/memory/memorydirty'
import { memoryreadplayersfromboard } from 'zss/memory/playermanagement'
import { CODE_PAGE } from 'zss/memory/types'

import {
  boardstreamfromcodepage,
  codepagefromboardstream,
  projectboardcodepage,
  projectgadget,
  projectmemory,
  projectplayerflags,
  unprojectstream,
} from './memoryproject'

// MEMORY

export function memorysyncensureregistered(): void {
  const stream = memorystream()
  const projected = projectmemory()
  if (!ispresent(streamreplserverreadstream(stream))) {
    streamreplserverregister(stream, projected)
    return
  }
  streamreplserverupdate(stream, projected)
}

function memorysyncadmitstream(player: string): void {
  memorysyncensureregistered()
  streamreplserverensureplayeradmitted(memorystream(), player, true)
}

// BOARD

export function memorysyncensureboardregistered(board: string): void {
  const codepage = memoryreadcodepagebyid(board)
  if (!ispresent(codepage)) {
    return
  }
  const stream = boardstreamfromcodepage(codepage)
  const projected = projectboardcodepage(codepage)
  if (!ispresent(streamreplserverreadstream(stream))) {
    streamreplserverregister(stream, projected)
    return
  }
  streamreplserverupdate(stream, projected)
}

function memorysyncadmitboardstream(player: string, board: string): void {
  memorysyncensureboardregistered(board)
  streamreplserverensureplayeradmitted(boardstream(board), player, true)
}

function memorysyncrevokeboardstream(player: string, board: string): void {
  streamreplserverdropplayer(boardstream(board), player)
}

// GADGET

export function memorysyncensuregadgetregistered(player: string): void {
  const streamid = gadgetstream(player)
  const projected = projectgadget(player)
  if (!ispresent(streamreplserverreadstream(streamid))) {
    streamreplserverregister(streamid, projected)
    return
  }
  streamreplserverupdate(streamid, projected)
}

function memorysyncadmitgadgetstreamsforboard(
  runner: string,
  players: string[],
): void {
  for (let i = 0; i < players.length; ++i) {
    const player = players[i]
    memorysyncensuregadgetregistered(player)
    // runner is in charge of rendering the gadget state for the players on this board
    streamreplserverensureplayeradmitted(gadgetstream(player), runner, true)
  }
}

function memorysyncrevokegadgetwritersforboard(
  runner: string,
  players: string[],
): void {
  for (let i = 0; i < players.length; ++i) {
    streamreplserverdropplayer(gadgetstream(players[i]), runner)
  }
}

// FLAGS

export function memorysyncensureflagsregistered(player: string): void {
  const stream = flagsstream(player)
  const projected = projectplayerflags(player)
  if (!ispresent(streamreplserverreadstream(stream))) {
    streamreplserverregister(stream, projected)
    return
  }
  streamreplserverupdate(stream, projected)
}

/** Lazily register `flags:*_chip` and admit the pusher as writer (first push / pull). */
export function memorysynclazyensurechipflagsstreamforpusher(
  streamid: string,
  pusherplayer: string,
): boolean {
  if (!ischipflagsstream(streamid)) {
    return false
  }
  const bagid = playerfromflagsstream(streamid)
  if (!isstring(bagid) || !bagid) {
    return false
  }
  memorysyncensureflagsregistered(bagid)
  streamreplserverensureplayeradmitted(streamid, pusherplayer, true)
  return ispresent(streamreplserverreadstream(streamid))
}

function memorysyncadmitchipflagsstreamsforboard(
  runner: string,
  boardaddress: string,
): void {
  const chipmemids = memorycollectchipmemidsforboard(boardaddress)
  for (let i = 0; i < chipmemids.length; ++i) {
    const bagid = chipmemids[i]
    memorysyncensureflagsregistered(bagid)
    streamreplserverensureplayeradmitted(flagsstream(bagid), runner, true)
  }
  const trackingbag = memorytrackingflagsbagid(boardaddress)
  memorysyncensureflagsregistered(trackingbag)
  streamreplserverensureplayeradmitted(flagsstream(trackingbag), runner, true)
}

function memorysyncrevokechipflagsstreamsforboard(
  runner: string,
  boardaddress: string,
): void {
  const chipmemids = memorycollectchipmemidsforboard(boardaddress)
  for (let i = 0; i < chipmemids.length; ++i) {
    streamreplserverdropplayer(flagsstream(chipmemids[i]), runner)
  }
  streamreplserverdropplayer(
    flagsstream(memorytrackingflagsbagid(boardaddress)),
    runner,
  )
}

function memorysyncadmitflagsstreamsforboard(
  runner: string,
  players: string[],
): void {
  for (let i = 0; i < players.length; ++i) {
    const player = players[i]
    memorysyncensureflagsregistered(player)
    streamreplserverensureplayeradmitted(flagsstream(player), runner, true)
  }
}

function memorysyncrevokeflagswritersforboard(
  runner: string,
  players: string[],
): void {
  for (let i = 0; i < players.length; ++i) {
    streamreplserverdropplayer(flagsstream(players[i]), runner)
  }
}

// BOARD RUNNER

export function memorysyncadmitboardrunner(
  runner: string,
  boardaddress: string,
): void {
  const players = memoryreadplayersfromboard(boardaddress)
  memorysyncadmitboardstream(runner, boardaddress)
  memorysyncadmitflagsstreamsforboard(runner, players)
  memorysyncadmitchipflagsstreamsforboard(runner, boardaddress)
  memorysyncadmitgadgetstreamsforboard(runner, players)
}

export function memorysyncrevokeboardrunner(
  runner: string,
  boardaddress: string,
): void {
  const players = memoryreadplayersfromboard(boardaddress)
  memorysyncrevokeboardstream(runner, boardaddress)
  memorysyncrevokeflagswritersforboard(runner, players)
  memorysyncrevokechipflagsstreamsforboard(runner, boardaddress)
  memorysyncrevokegadgetwritersforboard(runner, players)
}

// OTHER

export function memorysyncensureloginreplstreams(player: string): void {
  // admit the memory stream
  memorysyncadmitstream(player)
  memorysyncensuregadgetregistered(player)
  memorysyncensureflagsregistered(player)
}

// Full logout cleanup: drop the player from every stream, including the
// shared memory stream. Called from handlelogout after memorylogoutplayer
// has cleared the player's flags.
export function memorysyncdropplayerfromall(player: string): void {
  streamreplserverdropplayerfromallstreams(player)
}

/** Repl stream roster / membership can change without mutating books; still queue a memory push so clients resync. */
export function memorysyncmarkmemorydirty(): void {
  memorymarkdirty(memorystream())
}

// VM tick hooks: callers decide when to push. The handler in vm/handlers/tick
// invokes `memorysyncpushdirty` after `memorytickloaders` to drain the dirty set.
export function memorysyncupdatememory(): void {
  const stream = memorystream()
  const projected = projectmemory()
  streamreplserverupdate(stream, projected)
}

export function memorysyncupdateboard(codepage: CODE_PAGE): void {
  const stream = boardstreamfromcodepage(codepage)
  const projected = projectboardcodepage(codepage)
  streamreplserverupdate(stream, projected)
}

export function memorysyncpushdirty(): void {
  const dirtyids = memoryconsumealldirty()
  for (let i = 0; i < dirtyids.length; ++i) {
    const stream = dirtyids[i]
    if (!ispresent(streamreplserverreadstream(stream))) {
      // Stream not registered yet — re-queue so a later register + tick
      // still pushes this edit.
      memorymarkdirty(stream)
      continue
    }
    if (ismemorystream(stream)) {
      const projected = projectmemory()
      streamreplserverupdate(stream, projected)
      continue
    }
    if (isboardstream(stream)) {
      const codepage = codepagefromboardstream(stream)
      if (ispresent(codepage)) {
        const projected = projectboardcodepage(codepage)
        streamreplserverupdate(stream, projected)
        continue
      }
    }
    if (isgadgetstream(stream)) {
      const pid = playerfromgadgetstream(stream)
      if (pid) {
        const projected = projectgadget(pid)
        streamreplserverupdate(stream, projected)
      }
      continue
    }
    if (isflagsstream(stream)) {
      const pid = playerfromflagsstream(stream)
      if (pid) {
        const projected = projectplayerflags(pid)
        streamreplserverupdate(stream, projected)
      }
    }
  }
}

// Reverse-project (rxrepl): `memoryproject` pairs `project*` with `unproject*`.

export function memorysyncreverseproject(
  stream: string,
  document: unknown,
): void {
  unprojectstream(stream, document)
}
