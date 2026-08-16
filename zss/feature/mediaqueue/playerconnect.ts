import type { MediaConnection } from 'peerjs'
import { apilog } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import {
  mediaqueueensurevideosink,
  mediaqueueteardownplayersink,
} from 'zss/feature/mediaqueue/attachvideo'
import { mediaqueuecallmetadata } from 'zss/feature/mediaqueue/callmetadata'
import { MEDIAQUEUE_PEER_LABEL } from 'zss/feature/mediaqueue/constants'
import { mediaqueuebootstrap } from 'zss/feature/mediaqueue/receive'
import { mediaqueueattachvideosink } from 'zss/feature/mediaqueue/sinkregistry'
import { netterminalmediacall } from 'zss/feature/netterminal'
import { MAYBE, ispresent } from 'zss/mapping/types'

let activecall: MAYBE<MediaConnection>
let activestream: MAYBE<MediaStream>
let activehelperpeerid = ''
let connectedboard = ''

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
  if (
    ispresent(activecall) &&
    activehelperpeerid === trimmed &&
    connectedboard === gadgetboard
  ) {
    return
  }
  if (ispresent(activecall)) {
    mediaqueuedisconnect()
  }
  connectedboard = gadgetboard
  activehelperpeerid = trimmed
  const metadata = mediaqueuecallmetadata('player')
  const call = netterminalmediacall(trimmed, new MediaStream(), metadata)
  if (!ispresent(call)) {
    return
  }
  activecall = call
  call.on('stream', (stream) => {
    if (activecall !== call) {
      return
    }
    activestream = stream
    mediaqueueattachvideosink(MEDIAQUEUE_PEER_LABEL, stream)
    const player = registerreadplayer()
    apilog(SOFTWARE, player, `mediaqueue stream from ${trimmed}`)
  })
  call.on('close', () => {
    if (activecall === call) {
      mediaqueuedisconnect()
    }
  })
  call.on('error', () => {
    if (activecall === call) {
      mediaqueuedisconnect()
    }
  })
}

export function mediaqueuedisconnect() {
  mediaqueueteardownplayersink({
    call: activecall,
    stream: activestream,
    peerkey: MEDIAQUEUE_PEER_LABEL,
  })
  activecall = undefined
  activestream = undefined
  activehelperpeerid = ''
  connectedboard = ''
}

export function mediaqueuereadplayerconnectstate() {
  return {
    helperpeerid: activehelperpeerid,
    connectedboard,
    hascall: ispresent(activecall),
  }
}
