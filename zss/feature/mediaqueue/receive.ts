import Peer, { DataConnection, MediaConnection } from 'peerjs'
import { apierror, apilog } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import {
  MEDIAQUEUE_PROTOCOL,
  type MEDIAQUEUE_MESSAGE,
  ismediaqueuemessage,
} from 'zss/feature/mediaqueue/protocol'
import {
  mediaqueuecurrenturl,
  mediaqueuereadstate,
} from 'zss/feature/mediaqueue/queue'
import { mediaqueueattachvideosink } from 'zss/feature/mediaqueue/sinkregistry'
import { peerserveroptions } from 'zss/feature/peerserver'
import { createinfohash } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'

const MEDIAQUEUE_PEER_LABEL = 'mediaqueue'

let mediapeer: MAYBE<Peer>
let helperconnection: MAYBE<DataConnection>
let activecall: MAYBE<MediaConnection>
let listenplayer = ''

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
}

export function mediaqueuerequesthelpercall() {
  sendtohelper({ type: 'mediaqueue:requestcall' })
}

function clearremotevideo() {
  mediaqueueattachvideosink(MEDIAQUEUE_PEER_LABEL, undefined)
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

function handleinboundcall(call: MediaConnection) {
  if (ispresent(activecall) && activecall !== call) {
    activecall.close()
  }
  activecall = call
  call.answer()
  call.on('stream', (stream) => {
    mediaqueueattachvideosink(MEDIAQUEUE_PEER_LABEL, stream)
    if (listenplayer) {
      apilog(SOFTWARE, listenplayer, `mediaqueue stream from ${call.peer}`)
    }
  })
  call.on('close', () => {
    if (activecall === call) {
      activecall = undefined
      clearremotevideo()
    }
  })
  call.on('error', () => {
    if (activecall === call) {
      activecall = undefined
      clearremotevideo()
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

/** Start (or reuse) the receive Peer and answer MediaConnections. */
export function mediaqueuelisten(player: string): void {
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
  })

  mediapeer.on('connection', (conn) => {
    wirehelperconnection(conn)
  })

  mediapeer.on('call', handleinboundcall)

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
