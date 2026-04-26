import {
  rxstreamreplserverdropplayer,
  rxstreamreplserverdropplayerfromallstreams,
  rxstreamreplserverensureplayeradmitted,
  rxstreamreplserverreadstream,
  rxstreamreplserverregister,
  rxstreamreplserverupdate,
} from 'zss/device/rxstreamreplserver'
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
  if (!ispresent(rxstreamreplserverreadstream(stream))) {
    rxstreamreplserverregister(stream, projected)
    return
  }
  rxstreamreplserverupdate(stream, projected)
}

function memorysyncadmitstream(player: string): void {
  memorysyncensureregistered()
  rxstreamreplserverensureplayeradmitted(memorystream(), player, true)
}

// BOARD

export function memorysyncensureboardregistered(board: string): void {
  const codepage = memoryreadcodepagebyid(board)
  if (!ispresent(codepage)) {
    return
  }
  const stream = boardstreamfromcodepage(codepage)
  const projected = projectboardcodepage(codepage)
  if (!ispresent(rxstreamreplserverreadstream(stream))) {
    rxstreamreplserverregister(stream, projected)
    return
  }
  rxstreamreplserverupdate(stream, projected)
}

function memorysyncadmitboardstream(player: string, board: string): void {
  memorysyncensureboardregistered(board)
  rxstreamreplserverensureplayeradmitted(boardstream(board), player, true)
}

function memorysyncrevokeboardstream(player: string, board: string): void {
  rxstreamreplserverdropplayer(boardstream(board), player)
}

// GADGET

export function memorysyncensuregadgetregistered(player: string): void {
  const streamid = gadgetstream(player)
  const projected = projectgadget(player)
  if (!ispresent(rxstreamreplserverreadstream(streamid))) {
    rxstreamreplserverregister(streamid, projected)
    return
  }
  rxstreamreplserverupdate(streamid, projected)
}

function memorysyncadmitgadgetstreamsforboard(
  runner: string,
  players: string[],
): void {
  for (let i = 0; i < players.length; ++i) {
    const player = players[i]
    memorysyncensuregadgetregistered(player)
    // runner is in charge of rendering the gadget state for the players on this board
    rxstreamreplserverensureplayeradmitted(gadgetstream(player), runner, true)
  }
}

function memorysyncrevokegadgetwritersforboard(
  runner: string,
  players: string[],
): void {
  for (let i = 0; i < players.length; ++i) {
    rxstreamreplserverdropplayer(gadgetstream(players[i]), runner)
  }
}

// FLAGS

export function memorysyncensureflagsregistered(player: string): void {
  const stream = flagsstream(player)
  const projected = projectplayerflags(player)
  if (!ispresent(rxstreamreplserverreadstream(stream))) {
    rxstreamreplserverregister(stream, projected)
    return
  }
  rxstreamreplserverupdate(stream, projected)
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
  rxstreamreplserverensureplayeradmitted(streamid, pusherplayer, true)
  return ispresent(rxstreamreplserverreadstream(streamid))
}

function memorysyncadmitchipflagsstreamsforboard(
  runner: string,
  boardaddress: string,
): void {
  const chipmemids = memorycollectchipmemidsforboard(boardaddress)
  for (let i = 0; i < chipmemids.length; ++i) {
    const bagid = chipmemids[i]
    memorysyncensureflagsregistered(bagid)
    rxstreamreplserverensureplayeradmitted(flagsstream(bagid), runner, true)
  }
  const trackingbag = memorytrackingflagsbagid(boardaddress)
  memorysyncensureflagsregistered(trackingbag)
  rxstreamreplserverensureplayeradmitted(flagsstream(trackingbag), runner, true)
}

function memorysyncrevokechipflagsstreamsforboard(
  runner: string,
  boardaddress: string,
): void {
  const chipmemids = memorycollectchipmemidsforboard(boardaddress)
  for (let i = 0; i < chipmemids.length; ++i) {
    rxstreamreplserverdropplayer(flagsstream(chipmemids[i]), runner)
  }
  rxstreamreplserverdropplayer(
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
    rxstreamreplserverensureplayeradmitted(flagsstream(player), runner, true)
  }
}

function memorysyncrevokeflagswritersforboard(
  runner: string,
  players: string[],
): void {
  for (let i = 0; i < players.length; ++i) {
    rxstreamreplserverdropplayer(flagsstream(players[i]), runner)
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

/**
 * Repl stream ids a boardrunner is admitted to for `boardaddress` — same roster as
 * {@link memorysyncadmitboardrunner}. See zss/device/docs/rxdb-syncs-and-streams.md.
 */
export function memorysyncreplstreamidsforboardrunner(
  boardaddress: string,
): string[] {
  if (!isstring(boardaddress) || !boardaddress) {
    return []
  }
  const out: string[] = []
  out.push(boardstream(boardaddress))
  const players = memoryreadplayersfromboard(boardaddress)
  for (let i = 0; i < players.length; ++i) {
    out.push(flagsstream(players[i]))
  }
  const chipmemids = memorycollectchipmemidsforboard(boardaddress)
  for (let i = 0; i < chipmemids.length; ++i) {
    out.push(flagsstream(chipmemids[i]))
  }
  out.push(flagsstream(memorytrackingflagsbagid(boardaddress)))
  for (let i = 0; i < players.length; ++i) {
    out.push(gadgetstream(players[i]))
  }
  return out
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
}

// Full logout cleanup: drop the player from every stream, including the
// shared memory stream. Called from handlelogout after memorylogoutplayer
// has cleared the player's flags.
export function memorysyncdropplayerfromall(player: string): void {
  rxstreamreplserverdropplayerfromallstreams(player)
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
  rxstreamreplserverupdate(stream, projected)
}

export function memorysyncupdateboard(codepage: CODE_PAGE): void {
  const stream = boardstreamfromcodepage(codepage)
  const projected = projectboardcodepage(codepage)
  rxstreamreplserverupdate(stream, projected)
}

export function memorypushsimsyncdirty(): void {
  const dirtyids = memoryconsumealldirty()
  for (let i = 0; i < dirtyids.length; ++i) {
    const stream = dirtyids[i]
    if (!ispresent(rxstreamreplserverreadstream(stream))) {
      // Stream not registered yet — re-queue so a later register + tick
      // still pushes this edit.
      memorymarkdirty(stream)
      continue
    }
    if (ismemorystream(stream)) {
      const projected = projectmemory()
      rxstreamreplserverupdate(stream, projected)
      continue
    }
    if (isboardstream(stream)) {
      const codepage = codepagefromboardstream(stream)
      if (ispresent(codepage)) {
        const projected = projectboardcodepage(codepage)
        rxstreamreplserverupdate(stream, projected)
        continue
      }
    }
    if (isgadgetstream(stream)) {
      const pid = playerfromgadgetstream(stream)
      if (pid) {
        const projected = projectgadget(pid)
        rxstreamreplserverupdate(stream, projected)
      }
      continue
    }
    if (isflagsstream(stream)) {
      const pid = playerfromflagsstream(stream)
      if (pid) {
        const projected = projectplayerflags(pid)
        rxstreamreplserverupdate(stream, projected)
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
