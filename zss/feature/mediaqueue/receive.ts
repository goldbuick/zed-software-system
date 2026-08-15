import type { DataConnection, MediaConnection } from 'peerjs'
import { apierror, apilog } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import {
  mediaqueuecallmetadata,
  ismediaqueuecallmetadata,
} from 'zss/feature/mediaqueue/callmetadata'
import {
  MEDIAQUEUE_PROTOCOL,
  type MEDIAQUEUE_MESSAGE,
  ismediaqueuemessage,
} from 'zss/feature/mediaqueue/protocol'
import {
  mediaqueuecurrenturl,
  mediaqueuereadstate,
} from 'zss/feature/mediaqueue/queue'
import { mediaqueueroompeerids } from 'zss/feature/mediaqueue/roompeers'
import { mediaqueueattachvideosink } from 'zss/feature/mediaqueue/sinkregistry'
import {
  mediaqueueclearlistenstate,
  mediaqueuereadboundboardid,
  mediaqueuereadhelperpeerid,
  mediaqueuereadlistenplayer,
  mediaqueueislistening,
  mediaqueuesethasactiveroomstream,
  mediaqueuesethelperconnected,
  mediaqueuesethelperpeerid,
  mediaqueuesetlistenboardid,
  mediaqueuesetlistening,
  mediaqueuesetlistenplayer,
} from 'zss/feature/mediaqueue/listenstate'
import {
  netterminaldataconnect,
  netterminalmediacall,
  netterminalpeerisopen,
  netterminalregistermediacallhandler,
  netterminalregisterrosterchangehandler,
  readnetworkpeerid,
  readpeerroster,
} from 'zss/feature/netterminal'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import { memoryreadplayersonboard } from 'zss/memory/boardaccess'

const MEDIAQUEUE_PEER_LABEL = 'mediaqueue'

let helperconnection: MAYBE<DataConnection>
let activecall: MAYBE<MediaConnection>
let activeroomstream: MAYBE<MediaStream>
const roomoutbound = new Map<string, MediaConnection>()
let bootstrapped = false

function sendtohelper(message: MEDIAQUEUE_MESSAGE) {
  if (!ispresent(helperconnection) || !helperconnection.open) {
    return
  }
  helperconnection.send(message)
}

export function mediaqueuepushqueuesnapshot() {
  const state = mediaqueuereadstate()
  sendtohelper({
    type: 'mediaqueue:queue',
    urls: state.urls,
    index: state.index,
  })
  const url = mediaqueuecurrenturl()
  if (url) {
    sendtohelper({
      type: 'mediaqueue:goto',
      index: state.index,
      url,
    })
  }
  mediaqueuefanoutroom()
}

function mediaqueuerequesthelpercall() {
  sendtohelper({ type: 'mediaqueue:requestcall' })
}

function clearremotevideo() {
  mediaqueuesethasactiveroomstream(false)
  mediaqueueattachvideosink(MEDIAQUEUE_PEER_LABEL, undefined)
}

function closeroomoutbound() {
  for (const call of roomoutbound.values()) {
    try {
      call.close()
    } catch {
      // ignore
    }
  }
  roomoutbound.clear()
}

export function mediaqueuefanoutroom() {
  const listenplayer = mediaqueuereadlistenplayer()
  const listenboardid = mediaqueuereadboundboardid()
  if (!ispresent(activeroomstream) || !listenplayer || !listenboardid) {
    return
  }
  const board = memoryreadboardbyaddress(listenboardid)
  const boardplayers = memoryreadplayersonboard(board)
  const targets = mediaqueueroompeerids(
    boardplayers,
    readpeerroster(),
    readnetworkpeerid(),
  )
  const keep = new Set(targets)
  for (const [peerid, call] of roomoutbound) {
    if (!keep.has(peerid)) {
      try {
        call.close()
      } catch {
        // ignore
      }
      roomoutbound.delete(peerid)
    }
  }
  const metadata = mediaqueuecallmetadata('room')
  for (let i = 0; i < targets.length; ++i) {
    const peerid = targets[i]
    if (roomoutbound.has(peerid)) {
      continue
    }
    const call = netterminalmediacall(peerid, activeroomstream, metadata)
    if (!ispresent(call)) {
      continue
    }
    roomoutbound.set(peerid, call)
    call.on('close', () => {
      if (roomoutbound.get(peerid) === call) {
        roomoutbound.delete(peerid)
      }
    })
    call.on('error', () => {
      if (roomoutbound.get(peerid) === call) {
        roomoutbound.delete(peerid)
      }
    })
  }
  if (listenplayer && targets.length > 0) {
    apilog(
      SOFTWARE,
      listenplayer,
      `mediaqueue room fan-out to ${targets.length} peer(s)`,
    )
  }
}

function attachhelperstream(stream: MediaStream, frompeer: string) {
  activeroomstream = stream
  mediaqueuesethasactiveroomstream(true)
  mediaqueueattachvideosink(MEDIAQUEUE_PEER_LABEL, stream)
  const listenplayer = mediaqueuereadlistenplayer()
  if (listenplayer) {
    apilog(SOFTWARE, listenplayer, `mediaqueue stream from ${frompeer}`)
  }
  mediaqueuefanoutroom()
}

function handleinboundcall(
  call: MediaConnection,
  defaultsource?: 'helper' | 'room',
) {
  let metadata = call.metadata
  if (!ismediaqueuecallmetadata(metadata)) {
    if (!defaultsource) {
      // Ignore non-mediaqueue calls on shared clique Peer.
      return
    }
    metadata = mediaqueuecallmetadata(defaultsource)
  }

  if (metadata.source === 'helper') {
    if (ispresent(activecall) && activecall !== call) {
      activecall.close()
    }
    activecall = call
    call.answer()
    call.on('stream', (stream) => {
      attachhelperstream(stream, call.peer)
    })
    call.on('close', () => {
      if (activecall === call) {
        activecall = undefined
        activeroomstream = undefined
        mediaqueuesethasactiveroomstream(false)
        closeroomoutbound()
        clearremotevideo()
      }
    })
    call.on('error', () => {
      if (activecall === call) {
        activecall = undefined
        activeroomstream = undefined
        mediaqueuesethasactiveroomstream(false)
        closeroomoutbound()
        clearremotevideo()
      }
    })
    return
  }

  // Room fan-out: join (or host mate) receives board TV stream.
  call.answer()
  call.on('stream', (stream) => {
    mediaqueueattachvideosink(MEDIAQUEUE_PEER_LABEL, stream)
    const listenplayer = mediaqueuereadlistenplayer()
    const player = listenplayer || call.peer
    apilog(SOFTWARE, player, `mediaqueue room stream from ${call.peer}`)
  })
  call.on('close', () => {
    clearremotevideo()
  })
  call.on('error', () => {
    clearremotevideo()
  })
}

function handlehelperdata(data: unknown) {
  if (!ismediaqueuemessage(data)) {
    return
  }
  switch (data.type) {
    case 'mediaqueue:hello':
      if (data.role === 'helper' && mediaqueuereadlistenplayer()) {
        apilog(
          SOFTWARE,
          mediaqueuereadlistenplayer(),
          `mediaqueue helper connected (${data.peerid})`,
        )
        mediaqueuepushqueuesnapshot()
        mediaqueuerequesthelpercall()
      }
      break
    case 'mediaqueue:status':
      if (mediaqueuereadlistenplayer()) {
        const detail = data.detail ? ` ${data.detail}` : ''
        apilog(
          SOFTWARE,
          mediaqueuereadlistenplayer(),
          `mediaqueue helper: ${data.status}${detail}`,
        )
      }
      break
    default:
      break
  }
}

function wirehelperconnection(conn: DataConnection) {
  if (ispresent(helperconnection) && helperconnection !== conn) {
    helperconnection.close()
  }
  helperconnection = conn
  mediaqueuesethelperconnected(conn.open)
  conn.on('data', handlehelperdata)
  conn.on('open', () => {
    mediaqueuesethelperconnected(true)
    sendtohelper({
      type: 'mediaqueue:hello',
      protocol: MEDIAQUEUE_PROTOCOL,
      role: 'cafe',
      peerid: readnetworkpeerid() ?? '',
    })
    mediaqueuepushqueuesnapshot()
    mediaqueuerequesthelpercall()
  })
  conn.on('close', () => {
    if (helperconnection === conn) {
      helperconnection = undefined
      mediaqueuesethelperconnected(false)
    }
  })
  conn.on('error', () => {
    if (helperconnection === conn) {
      helperconnection = undefined
      mediaqueuesethelperconnected(false)
    }
  })
}

/** Wire clique Peer call + roster hooks so join tabs can join the board room. */
export function mediaqueuebootstrap() {
  if (bootstrapped) {
    return
  }
  bootstrapped = true
  netterminalregistermediacallhandler(handleinboundcall)
  netterminalregisterrosterchangehandler(() => {
    mediaqueuefanoutroom()
  })
}

/**
 * Connect to the desktop helper's Peer id and bind media to the player's
 * current board (board = room for fan-out).
 */
export function mediaqueuelisten(
  player: string,
  peerid: string,
  boardid: string,
  boardname?: string,
): void {
  mediaqueuebootstrap()
  const trimmed = peerid.trim()
  if (!trimmed) {
    apierror(
      SOFTWARE,
      player,
      'media',
      'enter the helper peer id from the Media Queue app first',
    )
    return
  }

  if (!netterminalpeerisopen()) {
    apierror(
      SOFTWARE,
      player,
      'media',
      'need netterminal peer -- run #joincode first',
    )
    return
  }

  const boundboardid = boardid.trim()
  if (!boundboardid) {
    apierror(
      SOFTWARE,
      player,
      'media',
      'need an active player on a board to bind media',
    )
    return
  }

  mediaqueuesetlistenplayer(player)

  if (mediaqueueislistening()) {
    if (
      mediaqueuereadhelperpeerid() === trimmed &&
      mediaqueuereadboundboardid() === boundboardid
    ) {
      apilog(
        SOFTWARE,
        player,
        `media already listening to helper ${trimmed} on board ${boardname || boundboardid}`,
      )
      return
    }
    apierror(
      SOFTWARE,
      player,
      'media',
      `already listening to helper ${mediaqueuereadhelperpeerid() || '?'} on board ${mediaqueuereadboundboardid() || '?'} -- use Stop in the scroll first`,
    )
    return
  }

  mediaqueuesethelperpeerid(trimmed)
  mediaqueuesetlistenboardid(boundboardid)
  mediaqueuesetlistening(true)
  apilog(
    SOFTWARE,
    player,
    `media bound to helper ${mediaqueuereadhelperpeerid()} on board ${boardname || boundboardid}`,
  )
  apilog(
    SOFTWARE,
    player,
    'waiting for Media Queue app to accept the connection',
  )
  const conn = netterminaldataconnect(mediaqueuereadhelperpeerid())
  if (ispresent(conn)) {
    wirehelperconnection(conn)
  } else {
    apierror(
      SOFTWARE,
      player,
      'media',
      'could not open helper data connection',
    )
    mediaqueueclearlistenstate()
  }
}

export function mediaqueuestop(player: string): void {
  mediaqueuesetlistenplayer(player)
  if (ispresent(activecall)) {
    activecall.close()
    activecall = undefined
  }
  activeroomstream = undefined
  mediaqueuesethasactiveroomstream(false)
  closeroomoutbound()
  clearremotevideo()
  if (ispresent(helperconnection)) {
    helperconnection.close()
    helperconnection = undefined
    mediaqueuesethelperconnected(false)
  }
  mediaqueueclearlistenstate()
  apilog(SOFTWARE, player, 'media stopped')
}
