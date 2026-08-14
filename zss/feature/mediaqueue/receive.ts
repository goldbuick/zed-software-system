import Peer, { DataConnection, MediaConnection } from 'peerjs'
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
  netterminalmediacall,
  netterminalregistermediacallhandler,
  netterminalregisterrosterchangehandler,
  readnetworkpeerid,
  readpeerroster,
} from 'zss/feature/netterminal'
import { peerserveroptions } from 'zss/feature/peerserver'
import { createinfohash } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { memoryreadplayersonboard } from 'zss/memory/boardaccess'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'

const MEDIAQUEUE_PEER_LABEL = 'mediaqueue'

let mediapeer: MAYBE<Peer>
let helperconnection: MAYBE<DataConnection>
let activecall: MAYBE<MediaConnection>
let listenplayer = ''
let activeroomstream: MAYBE<MediaStream>
const roomoutbound = new Map<string, MediaConnection>()
let bootstrapped = false

function mediapeeridforplayer(player: string) {
  return createinfohash(`${MEDIAQUEUE_PEER_LABEL}:${player}`)
}

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

export function mediaqueuerequesthelpercall() {
  sendtohelper({ type: 'mediaqueue:requestcall' })
}

function clearremotevideo() {
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
  if (!ispresent(activeroomstream) || !listenplayer) {
    return
  }
  const board = memoryreadplayerboard(listenplayer)
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
  mediaqueueattachvideosink(MEDIAQUEUE_PEER_LABEL, stream)
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
        closeroomoutbound()
        clearremotevideo()
      }
    })
    call.on('error', () => {
      if (activecall === call) {
        activecall = undefined
        activeroomstream = undefined
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
      if (data.role === 'helper' && listenplayer) {
        apilog(
          SOFTWARE,
          listenplayer,
          `mediaqueue helper connected (${data.peerid})`,
        )
        mediaqueuepushqueuesnapshot()
        mediaqueuerequesthelpercall()
      }
      break
    case 'mediaqueue:status':
      if (listenplayer) {
        const detail = data.detail ? ` ${data.detail}` : ''
        apilog(
          SOFTWARE,
          listenplayer,
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
  conn.on('data', handlehelperdata)
  conn.on('open', () => {
    sendtohelper({
      type: 'mediaqueue:hello',
      protocol: MEDIAQUEUE_PROTOCOL,
      role: 'cafe',
      peerid: mediapeer?.id ?? '',
    })
    mediaqueuepushqueuesnapshot()
  })
  conn.on('close', () => {
    if (helperconnection === conn) {
      helperconnection = undefined
    }
  })
  conn.on('error', () => {
    if (helperconnection === conn) {
      helperconnection = undefined
    }
  })
}

export function mediaqueuereadpeerid(): string | undefined {
  if (ispresent(mediapeer) && mediapeer.open && mediapeer.id) {
    return mediapeer.id
  }
  return undefined
}

export function mediaqueueislistening(): boolean {
  return ispresent(mediapeer)
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

/** Start (or reuse) the receive Peer and answer MediaConnections. */
export function mediaqueuelisten(player: string): void {
  mediaqueuebootstrap()
  listenplayer = player
  if (ispresent(mediapeer)) {
    const id = mediaqueuereadpeerid()
    if (id) {
      apilog(SOFTWARE, player, `mediaqueue already listening as ${id}`)
      return
    }
  }

  const peerid = mediapeeridforplayer(player)
  mediapeer = new Peer(peerid, peerserveroptions())

  mediapeer.on('open', (id) => {
    apilog(SOFTWARE, player, `mediaqueue listening as ${id}`)
    apilog(
      SOFTWARE,
      player,
      'paste that peer id into the Media Queue desktop app',
    )
    apilog(
      SOFTWARE,
      player,
      'board mates on joincode receive the same stream (board = room)',
    )
  })

  mediapeer.on('connection', (conn) => {
    wirehelperconnection(conn)
  })

  mediapeer.on('call', (call) => {
    handleinboundcall(call, 'helper')
  })

  mediapeer.on('error', (err) => {
    apierror(
      SOFTWARE,
      player,
      'mediaqueue',
      `${err.type ?? 'error'}: ${err.message ?? String(err)}`,
    )
  })
}

export function mediaqueuestop(player: string): void {
  listenplayer = player
  if (ispresent(activecall)) {
    activecall.close()
    activecall = undefined
  }
  activeroomstream = undefined
  closeroomoutbound()
  clearremotevideo()
  if (ispresent(helperconnection)) {
    helperconnection.close()
    helperconnection = undefined
  }
  if (ispresent(mediapeer)) {
    mediapeer.destroy()
    mediapeer = undefined
  }
  apilog(SOFTWARE, player, 'mediaqueue stopped')
}
