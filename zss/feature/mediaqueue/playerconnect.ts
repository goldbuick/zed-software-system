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
  mediaqueueislistening,
  mediaqueuereadboundboardid,
  mediaqueuereadhelperpeerid,
} from 'zss/feature/mediaqueue/listenstate'
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
const pctracklisteners = new Map<MediaConnection, (evt: RTCTrackEvent) => void>()
const calltrackpollers = new Map<MediaConnection, ReturnType<typeof setInterval>>()

function retryplayerconnectfromlayer() {
  const layer = mediaqueuereadplayerlayerstate()
  if (!layer.helperpeerid || !layer.board || ispresent(activecall)) {
    return
  }
  tryplayerconnect(layer.helperpeerid, layer.board)
}

netterminalregisterpeeropenhandler(retryplayerconnectfromlayer)

function streamhasmedia(stream: MediaStream): boolean {
  return (
    stream.getVideoTracks().length > 0 || stream.getAudioTracks().length > 0
  )
}

function streamfromreceivers(pc: RTCPeerConnection): MediaStream | undefined {
  const receivers = pc.getReceivers?.() ?? []
  const tracks: MediaStreamTrack[] = []
  for (let i = 0; i < receivers.length; ++i) {
    const track = receivers[i]?.track
    if (track) {
      tracks.push(track)
    }
  }
  if (tracks.length === 0) {
    return undefined
  }
  return new MediaStream(tracks)
}

function clearcalltrackpoll(call: MediaConnection) {
  const poller = calltrackpollers.get(call)
  if (poller) {
    clearInterval(poller)
    calltrackpollers.delete(call)
  }
}

function clearpctracklistener(call: MediaConnection) {
  clearcalltrackpoll(call)
  const pc = call.peerConnection
  const listener = pctracklisteners.get(call)
  if (pc && listener) {
    pc.removeEventListener('track', listener)
  }
  pctracklisteners.delete(call)
}

function attachplayerstream(stream: MediaStream, helperpeerid: string) {
  if (!streamhasmedia(stream)) {
    return false
  }
  for (const track of stream.getTracks()) {
    if (track.muted) {
      track.addEventListener(
        'unmute',
        () => {
          if (activestream === stream || !ispresent(activestream)) {
            attachplayerstream(stream, helperpeerid)
          }
        },
        { once: true },
      )
    }
  }
  activestream = stream
  mediaqueueattachvideosink(MEDIAQUEUE_PEER_LABEL, stream)
  mediaqueuesetplayerlayerpending(false)
  const player = registerreadplayer()
  apilog(
    SOFTWARE,
    player,
    `mediaqueue stream from ${helperpeerid} v=${stream.getVideoTracks().length} a=${stream.getAudioTracks().length}`,
  )
  return true
}

function synccallstream(call: MediaConnection, helperpeerid: string): boolean {
  if (activecall !== call) {
    return false
  }
  const pc = call.peerConnection
  if (!pc) {
    return false
  }
  const merged = streamfromreceivers(pc)
  if (!ispresent(merged) || !streamhasmedia(merged)) {
    return false
  }
  return attachplayerstream(merged, helperpeerid)
}

function wirecalltrackbridge(call: MediaConnection, helperpeerid: string) {
  clearpctracklistener(call)

  const ontrack = (evt: RTCTrackEvent) => {
    if (activecall !== call) {
      return
    }
    void evt
    synccallstream(call, helperpeerid)
  }

  const trywire = (): boolean => {
    if (activecall !== call) {
      return true
    }
    const pc = call.peerConnection
    if (!pc) {
      return false
    }
    if (!pctracklisteners.has(call)) {
      pctracklisteners.set(call, ontrack)
      pc.addEventListener('track', ontrack)
    }
    return synccallstream(call, helperpeerid)
  }

  if (trywire()) {
    return
  }

  let attempts = 0
  const poller = setInterval(() => {
    attempts += 1
    if (trywire() || activecall !== call || attempts > 100) {
      clearcalltrackpoll(call)
    }
  }, 50)
  calltrackpollers.set(call, poller)
}

function wirecallhandlers(call: MediaConnection, helperpeerid: string) {
  wirecalltrackbridge(call, helperpeerid)
  call.on('stream', (stream) => {
    if (activecall !== call) {
      return
    }
    if (streamhasmedia(stream)) {
      attachplayerstream(stream, helperpeerid)
      return
    }
    synccallstream(call, helperpeerid)
  })
  call.on('close', () => {
    if (activecall !== call) {
      return
    }
    clearpctracklistener(call)
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
    clearpctracklistener(call)
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
    clearpctracklistener(activecall)
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
    if (!ispresent(activestream)) {
      synccallstream(activecall, trimmed)
    }
    mediaqueuesetplayerlayerpending(false)
    return true
  }
  const player = registerreadplayer()
  apilog(SOFTWARE, player, `mediaqueue connecting to helper ${trimmed}`)
  const metadata = mediaqueuecallmetadata('player')
  const call = netterminalmediacall(trimmed, new MediaStream(), metadata)
  if (!ispresent(call)) {
    mediaqueuesetplayerlayerpending(true)
    return false
  }
  mediaqueuesetplayerlayerpending(false)
  activecall = call
  wirecallhandlers(call, trimmed)
  return true
}

function readconnectboard(gadgetboard: string): string {
  const trimmed = gadgetboard.trim()
  if (trimmed) {
    return trimmed
  }
  return mediaqueuereadboundboardid().trim()
}

export function mediaqueueconnectifonboard(
  helperpeerid: string,
  gadgetboard: string,
) {
  mediaqueuebootstrap()
  mediaqueueensurevideosink()
  const trimmed =
    helperpeerid.trim() || mediaqueuereadhelperpeerid().trim()
  const board = readconnectboard(gadgetboard)
  if (!trimmed || !board) {
    if (
      !mediaqueueislistening() ||
      !mediaqueuereadhelperpeerid() ||
      !mediaqueuereadboundboardid()
    ) {
      mediaqueuedisconnect()
    }
    return
  }
  const layer = mediaqueuereadplayerlayerstate()
  const samelayer =
    layer.helperpeerid === trimmed &&
    layer.board === board &&
    ispresent(activecall)
  mediaqueuesetplayerlayerstate(trimmed, board, layer.pendingconnect)
  if (samelayer) {
    if (!ispresent(activestream) && ispresent(activecall)) {
      synccallstream(activecall, trimmed)
    }
    return
  }
  if (ispresent(activecall)) {
    teardownactivecall()
  }
  tryplayerconnect(trimmed, board)
}

/** Retry outbound helper MediaConnection when control plane says playback started. */
export function mediaqueueretryplayerconnect() {
  const layer = mediaqueuereadplayerlayerstate()
  if (ispresent(activecall)) {
    const helper =
      layer.helperpeerid ||
      mediaqueuereadhelperpeerid() ||
      activecall.peer ||
      ''
    if (helper && !ispresent(activestream)) {
      synccallstream(activecall, helper)
    }
    return
  }
  if (layer.helperpeerid && layer.board) {
    tryplayerconnect(layer.helperpeerid, layer.board)
    return
  }
  const helper = mediaqueuereadhelperpeerid()
  const board = mediaqueuereadboundboardid()
  if (!helper || !board || !mediaqueueislistening()) {
    return
  }
  mediaqueuesetplayerlayerstate(helper, board, true)
  tryplayerconnect(helper, board)
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
    hasstream: ispresent(activestream),
  }
}
