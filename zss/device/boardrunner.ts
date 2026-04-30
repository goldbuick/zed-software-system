import { createdevice } from 'zss/device'
import {
  leafapplyinbound,
  leafprepareoutbound,
} from 'zss/feature/jsondiffsync/leaf'
import { createleafsession } from 'zss/feature/jsondiffsync/session'
import { logjsondiffsyncdebouncedrequest } from 'zss/feature/jsondiffsync/syncdebug'
import {
  JSONDIFFSYNC_STREAM_BOARD,
  JSONDIFFSYNC_STREAM_FLAGS,
  JSONDIFFSYNC_STREAM_MEMORY,
  LEAF_SESSION,
  SYNC_MESSAGE,
  issyncmessage,
} from 'zss/feature/jsondiffsync/types'
import { gadgetstate } from 'zss/gadget/data/api'
import { INPUT } from 'zss/gadget/data/types'
import { MAYBE, isarray, ispresent } from 'zss/mapping/types'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import { memoryhasflags, memoryreadflags } from 'zss/memory/flags'
import { memoryreadbookgadgetlayersmap } from 'zss/memory/gadgetlayersflags'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import { memoryreadgadgetlayers } from 'zss/memory/rendering'
import { memorytickmain } from 'zss/memory/runtime'
import {
  memoryreadbookbysoftware,
  memoryreadhalt,
  memoryreadoperator,
  memoryreadroot,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'

import {
  type ACKTICK_GADGET_PAYLOAD,
  vmacktick,
  vmhubsyncleaf,
  vmjsondiffsync,
} from './api'
import { refreshmemoryleafstreamingore } from './vm/jsondiffsyncstreams'

/** Per-stream leaf sessions (multiplexed hub↔runner jsondiffsync). */
const leafsessions = new Map<string, LEAF_SESSION>()

export function createboardrunnerleafsession(player: string) {
  gadgetstate(player)
  leafsessions.clear()
  const memleaf = createleafsession(
    player,
    memoryreadroot(),
    JSONDIFFSYNC_STREAM_MEMORY,
    [],
  )
  refreshmemoryleafstreamingore(memleaf)
  leafsessions.set(JSONDIFFSYNC_STREAM_MEMORY, memleaf)
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (ispresent(mainbook)) {
    const flagleaf = createleafsession(
      player,
      mainbook.flags,
      JSONDIFFSYNC_STREAM_FLAGS,
      [],
    )
    leafsessions.set(JSONDIFFSYNC_STREAM_FLAGS, flagleaf)
    requeststreamsnapshot(player, JSONDIFFSYNC_STREAM_FLAGS)
  }
  requeststreamsnapshot(player, JSONDIFFSYNC_STREAM_MEMORY)
}

function leafforsyncmessage(sync: SYNC_MESSAGE): MAYBE<LEAF_SESSION> {
  if (sync.streamid === JSONDIFFSYNC_STREAM_BOARD) {
    const leaf = leafsessions.get(JSONDIFFSYNC_STREAM_BOARD)
    if (!ispresent(leaf)) {
      return undefined
    }
    if (
      typeof sync.boardsynctarget === 'string' &&
      sync.boardsynctarget !== leaf.boardsynctarget
    ) {
      return undefined
    }
    return leaf
  }
  return leafsessions.get(sync.streamid)
}

function requeststreamsnapshot(
  player: string,
  streamid: string,
  boardsynctarget?: string,
  force = false,
): void {
  const leaf = leafsessions.get(streamid)
  if (!ispresent(leaf)) {
    return
  }
  if (
    streamid === JSONDIFFSYNC_STREAM_BOARD &&
    typeof boardsynctarget === 'string' &&
    boardsynctarget !== leaf.boardsynctarget
  ) {
    return
  }
  if (leaf.awaitingsnapshot && !force) {
    logjsondiffsyncdebouncedrequest(player)
    return
  }
  const message: SYNC_MESSAGE = {
    kind: 'requestsnapshot',
    streamid,
    senderpeer: player,
    seq: 0,
    ackpeerseq: 0,
    ...(boardsynctarget !== undefined ? { boardsynctarget } : {}),
  }
  leaf.awaitingsnapshot = true
  vmjsondiffsync(boardrunner, player, message)
}

function ensureboardstreamleaf(player: string, boardaddress: string): void {
  const boarddoc = memoryreadboardbyaddress(boardaddress)
  if (!ispresent(boarddoc)) {
    leafsessions.delete(JSONDIFFSYNC_STREAM_BOARD)
    return
  }
  const cur = leafsessions.get(JSONDIFFSYNC_STREAM_BOARD)
  if (
    ispresent(cur) &&
    cur.boardsynctarget === boardaddress &&
    cur.working === boarddoc
  ) {
    return
  }
  leafsessions.set(
    JSONDIFFSYNC_STREAM_BOARD,
    createleafsession(
      player,
      boarddoc,
      JSONDIFFSYNC_STREAM_BOARD,
      [],
      boardaddress,
    ),
  )
  requeststreamsnapshot(player, JSONDIFFSYNC_STREAM_BOARD, boardaddress, true)
}

function buildacktickgadgetpayload(
  boardid: string,
): MAYBE<ACKTICK_GADGET_PAYLOAD> {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return undefined
  }
  const entries: ACKTICK_GADGET_PAYLOAD['entries'] = []
  const activelist = mainbook.activelist ?? []
  for (let i = 0; i < activelist.length; ++i) {
    const pid = activelist[i]
    const pb = memoryreadplayerboard(pid)
    if (!ispresent(pb) || pb.id !== boardid) {
      continue
    }
    const g = gadgetstate(pid)
    entries.push({
      player: pid,
      scrollname: g.scrollname,
      scroll: g.scroll,
      sidebar: g.sidebar,
    })
  }
  if (entries.length === 0) {
    return undefined
  }
  return { boardid, entries }
}

const boardrunner = createdevice('boardrunner', ['ready'], (message) => {
  if (!boardrunner.session(message)) {
    return
  }

  const memoryleaf = leafsessions.get(JSONDIFFSYNC_STREAM_MEMORY)

  // filtering messages
  switch (message.target) {
    case 'tick':
      if (message.player !== memoryleaf?.peer) {
        return
      }
      break
    default:
      break
  }

  // processing messages
  switch (message.target) {
    case 'boot':
      if (leafsessions.size === 0) {
        createboardrunnerleafsession(message.player)
      }
      break
    case 'tick':
      if (
        ispresent(memoryleaf) &&
        isarray(message.data) &&
        !memoryleaf.awaitingsnapshot
      ) {
        const [board, timestamp] = message.data as [string, number]
        memorytickmain(board, timestamp, memoryreadhalt())
        const boardrecord = memoryreadboardbyaddress(board)
        const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
        if (ispresent(mainbook)) {
          const store = memoryreadbookgadgetlayersmap(mainbook)
          if (ispresent(boardrecord)) {
            const renderplayer = memoryreadoperator() || message.player
            store[boardrecord.id] = memoryreadgadgetlayers(
              renderplayer,
              boardrecord,
            )
          } else {
            delete store[board]
          }
        }
        ensureboardstreamleaf(message.player, board)
        vmacktick(boardrunner, message.player, buildacktickgadgetpayload(board))
        refreshmemoryleafstreamingore(memoryleaf)
        /** Push local edits to the VM hub in deterministic stream order. */
        const streamorder = [
          JSONDIFFSYNC_STREAM_MEMORY,
          JSONDIFFSYNC_STREAM_FLAGS,
          JSONDIFFSYNC_STREAM_BOARD,
        ]
        for (let s = 0; s < streamorder.length; ++s) {
          const sid = streamorder[s]
          const sess = leafsessions.get(sid)
          if (!ispresent(sess) || sess.awaitingsnapshot) {
            continue
          }
          const prep = leafprepareoutbound(sess)
          if (prep.message !== undefined) {
            vmjsondiffsync(boardrunner, message.player, prep.message)
          }
        }
      }
      break
    case 'input': {
      if (memoryhasflags(message.player)) {
        const flags = memoryreadflags(message.player)
        const [input = INPUT.NONE, mods = 0] = message.data ?? [INPUT.NONE, 0]
        if (!isarray(flags.inputqueue)) {
          flags.inputqueue = []
        }
        if (input !== INPUT.NONE) {
          flags.inputqueue.push([input, mods])
        }
      }
      break
    }
    case 'jsondiffsync': {
      if (!issyncmessage(message.data) || message.player !== memoryleaf?.peer) {
        break
      }
      const sync = message.data
      const sess = leafforsyncmessage(sync)
      if (!ispresent(sess)) {
        if (sync.streamid === JSONDIFFSYNC_STREAM_BOARD) {
          requeststreamsnapshot(
            message.player,
            JSONDIFFSYNC_STREAM_BOARD,
            sync.boardsynctarget,
            true,
          )
        }
        break
      }
      const wasawaitingsnapshot = sess.awaitingsnapshot
      const inbound = leafapplyinbound(sess, sync)
      if (!inbound.ok) {
        requeststreamsnapshot(
          message.player,
          sync.streamid,
          sync.boardsynctarget,
          sess.awaitingsnapshot,
        )
      } else {
        const emptyleafhuback =
          sync.kind === 'delta' && sync.operations.length === 0
        const skiphubsyncleaf =
          wasawaitingsnapshot &&
          sync.kind !== 'fullsnapshot' &&
          inbound.changed === false &&
          !emptyleafhuback
        if (!skiphubsyncleaf) {
          vmhubsyncleaf(
            boardrunner,
            message.player,
            sync.streamid,
            sync.boardsynctarget,
          )
        }
        if (inbound.changed) {
          const prep = leafprepareoutbound(sess)
          if (prep.message !== undefined) {
            vmjsondiffsync(boardrunner, message.player, prep.message)
          }
        }
      }
      break
    }
    default:
      break
  }
})
