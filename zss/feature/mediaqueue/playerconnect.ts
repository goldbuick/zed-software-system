import type { MediaConnection } from 'peerjs'
import { apilog } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import {
  mediaqueueensurevideosink,
  mediaqueueteardownplayersink,
} from 'zss/feature/mediaqueue/attachvideo'
import { mediaqueuebootstrap } from 'zss/feature/mediaqueue/bootstrap'
import { mediaqueuecallmetadata } from 'zss/feature/mediaqueue/callmetadata'
import { MEDIAQUEUE_PEER_LABEL } from 'zss/feature/mediaqueue/constants'
import {
  mediaqueueclearplayerlayerstate,
  mediaqueuereadplayerlayerstate,
  mediaqueuesetplayerlayerpending,
  mediaqueuesetplayerlayerstate,
} from 'zss/feature/mediaqueue/playerlayerstate'
import { mediaqueueattachvideosink } from 'zss/feature/mediaqueue/sinkregistry'
import {
  netterminalmediacall,
  netterminalregisterpeeropenhandler,
} from 'zss/feature/netterminal'
import { MAYBE, ispresent } from 'zss/mapping/types'

let activecall: MAYBE<MediaConnection>
let activestream: MAYBE<MediaStream>
let peeropenretrywired = false
const streamtracklisteners = new Map<MediaConnection, () => void>()

function streamhasmedia(stream: MediaStream): boolean {
  return (
    stream.getVideoTracks().length > 0 || stream.getAudioTracks().length > 0
  )
}

function clearstreamtracklistener(call: MediaConnection) {
  const listener = streamtracklisteners.get(call)
  if (listener && activestream) {
    activestream.removeEventListener('addtrack', listener)
  }
  streamtracklisteners.delete(call)
}

function attachplayerstream(stream: MediaStream, helperpeerid: string) {
  if (!streamhasmedia(stream)) {
    return
  }
  activestream = stream
  mediaqueueattachvideosink(MEDIAQUEUE_PEER_LABEL, stream)
  mediaqueuesetplayerlayerpending(false)
  const player = registerreadplayer()
  apilog(SOFTWARE, player, `mediaqueue stream from ${helperpeerid}`)
}

function wirestreamfromcall(
  call: MediaConnection,
  stream: MediaStream,
  helperpeerid: string,
) {
  clearstreamtracklistener(call)
  const ontracks = () => {
    if (activecall !== call) {
      return
    }
    attachplayerstream(stream, helperpeerid)
  }
  streamtracklisteners.set(call, ontracks)
  stream.addEventListener('addtrack', ontracks)
  ontracks()
}

function wirepeeropenretry() {
  if (peeropenretrywired) {
    return
  }
  peeropenretrywired = true
  netterminalregisterpeeropenhandler(() => {
    const layer = mediaqueuereadplayerlayerstate()
    if (layer.pendingconnect && layer.helperpeerid && layer.board) {
      tryplayerconnect(layer.helperpeerid, layer.board)
    }
  })
}

function wirecallhandlers(call: MediaConnection, helperpeerid: string) {
  call.on('stream', (stream) => {
    if (activecall !== call) {
      return
    }
    wirestreamfromcall(call, stream, helperpeerid)
  })
  call.on('close', () => {
    if (activecall !== call) {
      return
    }
    clearstreamtracklistener(call)
    teardownactivecall()
    const layer = mediaqueuereadplayerlayerstate()
    if (layer.helperpeerid && layer.board) {
      mediaqueuesetplayerlayerpending(true)
      tryplayerconnect(layer.helperpeerid, layer.board)
    }
  })
  call.on('error', () => {
    if (activecall !== call) {
      return
    }
    clearstreamtracklistener(call)
    teardownactivecall()
    const layer = mediaqueuereadplayerlayerstate()
    if (layer.helperpeerid && layer.board) {
      mediaqueuesetplayerlayerpending(true)
      tryplayerconnect(layer.helperpeerid, layer.board)
    }
  })
}

function teardownactivecall() {
  if (ispresent(activecall)) {
    clearstreamtracklistener(activecall)
  }
  mediaqueueteardownplayersink({
    call: activecall,
    stream: activestream,
    peerkey: MEDIAQUEUE_PEER_LABEL,
  })
  activecall = undefined
  activestream = undefined
}

function tryplayerconnect(helperpeerid: string, gadgetboard: string): boolean {
  const trimmed = helperpeerid.trim()
  if (!trimmed || !gadgetboard) {
    return false
  }
  if (ispresent(activecall)) {
    mediaqueuesetplayerlayerpending(false)
    return true
  }
  const metadata = mediaqueuecallmetadata('player')
  const call = netterminalmediacall(trimmed, new MediaStream(), metadata)
  if (!ispresent(call)) {
    mediaqueuesetplayerlayerpending(true)
    wirepeeropenretry()
    return false
  }
  mediaqueuesetplayerlayerpending(false)
  activecall = call
  wirecallhandlers(call, trimmed)
  return true
}

export function mediaqueueconnectifonboard(
  helperpeerid: string,
  gadgetboard: string,
) {
  mediaqueuebootstrap()
  mediaqueueensurevideosink()
  const trimmed = helperpeerid.trim()
  if (!trimmed || !gadgetboard) {
    mediaqueuedisconnect()
    return
  }
  const layer = mediaqueuereadplayerlayerstate()
  const samelayer =
    layer.helperpeerid === trimmed &&
    layer.board === gadgetboard &&
    ispresent(activecall)
  mediaqueuesetplayerlayerstate(trimmed, gadgetboard, layer.pendingconnect)
  if (samelayer) {
    return
  }
  if (ispresent(activecall)) {
    teardownactivecall()
  }
  tryplayerconnect(trimmed, gadgetboard)
}

export function mediaqueuedisconnect() {
  teardownactivecall()
  mediaqueueclearplayerlayerstate()
}

export function mediaqueuereadplayerconnectstate() {
  const layer = mediaqueuereadplayerlayerstate()
  return {
    helperpeerid: layer.helperpeerid,
    connectedboard: layer.board,
    hascall: ispresent(activecall),
    pendingconnect: layer.pendingconnect,
  }
}
