import type { MediaConnection } from 'peerjs'
import { apierror, apilog } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import {
  mediaqueueensurevideosink,
  mediaqueueteardownplayersink,
} from 'zss/feature/mediaqueue/attachvideo'
import { mediaqueuereadaudiogain } from 'zss/feature/mediaqueue/boardtvaudio'
import { mediaqueuebootstrap } from 'zss/feature/mediaqueue/bootstrap'
import { mediaqueuesyncbroadcastaudio } from 'zss/feature/mediaqueue/broadcastaudio'
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

const TRACK_SYNC_TIMEOUT_MS = 30_000
const TRACK_SYNC_POLL_MS = 50
const TRACK_SYNC_POLL_MAX = TRACK_SYNC_TIMEOUT_MS / TRACK_SYNC_POLL_MS

let playerofferstreamcache: MAYBE<MediaStream>
let playerofferaudiocontext: MAYBE<AudioContext>

function playersilentaudiotrack(): MAYBE<MediaStreamTrack> {
  if (typeof AudioContext === 'undefined') {
    return undefined
  }
  try {
    if (!ispresent(playerofferaudiocontext)) {
      playerofferaudiocontext = new AudioContext()
    }
    const dest = playerofferaudiocontext.createMediaStreamDestination()
    const osc = playerofferaudiocontext.createOscillator()
    const gain = playerofferaudiocontext.createGain()
    gain.gain.value = 0
    osc.connect(gain)
    gain.connect(dest)
    osc.start()
    return dest.stream.getAudioTracks()[0]
  } catch {
    return undefined
  }
}

/** PeerJS/Chrome may ignore recv-only offers with zero tracks; send a silent 1x1 canvas track. */
function playerofferstream(): MediaStream {
  if (ispresent(playerofferstreamcache)) {
    return playerofferstreamcache
  }
  if (typeof document === 'undefined') {
    playerofferstreamcache = new MediaStream()
    return playerofferstreamcache
  }
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const stream = canvas.captureStream(0)
    const audio = playersilentaudiotrack()
    if (ispresent(audio)) {
      stream.addTrack(audio)
    }
    if (stream.getTracks().length > 0) {
      playerofferstreamcache = stream
      return stream
    }
  } catch {
    // fall through
  }
  playerofferstreamcache = new MediaStream()
  return playerofferstreamcache
}

let activecall: MAYBE<MediaConnection>
let activestream: MAYBE<MediaStream>
const pctracklisteners = new Map<
  MediaConnection,
  (evt: RTCTrackEvent) => void
>()
const pcstatelisteners = new Map<MediaConnection, () => void>()
const calltrackpollers = new Map<
  MediaConnection,
  ReturnType<typeof setInterval>
>()
const calltracksynctimers = new Map<
  MediaConnection,
  ReturnType<typeof setTimeout>
>()

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

function streamtrackids(stream: MediaStream): string {
  return stream
    .getTracks()
    .map((track) => `${track.kind}:${track.id}`)
    .sort()
    .join('|')
}

function streammatches(left: MediaStream, right: MediaStream): boolean {
  return streamtrackids(left) === streamtrackids(right)
}

function readcallstream(call: MediaConnection): MediaStream | undefined {
  const pc = call.peerConnection
  const bykind = new Map<string, MediaStreamTrack>()
  function addtrack(track: MediaStreamTrack | null | undefined) {
    if (!track || bykind.has(track.kind)) {
      return
    }
    bykind.set(track.kind, track)
  }
  if (pc) {
    const receivers = pc.getReceivers?.() ?? []
    for (let i = 0; i < receivers.length; ++i) {
      addtrack(receivers[i]?.track ?? undefined)
    }
  }
  const remote = (call as { remoteStream?: MediaStream }).remoteStream
  if (ispresent(remote)) {
    for (const track of remote.getTracks()) {
      addtrack(track)
    }
  }
  if (bykind.size === 0) {
    return undefined
  }
  return new MediaStream([...bykind.values()])
}

function clearcalltrackpoll(call: MediaConnection) {
  const poller = calltrackpollers.get(call)
  if (poller) {
    clearInterval(poller)
    calltrackpollers.delete(call)
  }
}

function clearcalltracksynctimer(call: MediaConnection) {
  const timer = calltracksynctimers.get(call)
  if (timer) {
    clearTimeout(timer)
    calltracksynctimers.delete(call)
  }
}

function clearpctracklistener(call: MediaConnection) {
  clearcalltrackpoll(call)
  clearcalltracksynctimer(call)
  const pc = call.peerConnection
  const listener = pctracklisteners.get(call)
  if (pc && listener) {
    pc.removeEventListener('track', listener)
  }
  pctracklisteners.delete(call)
  const statelistener = pcstatelisteners.get(call)
  if (pc && statelistener) {
    pc.removeEventListener('iceconnectionstatechange', statelistener)
    pc.removeEventListener('connectionstatechange', statelistener)
  }
  pcstatelisteners.delete(call)
}

function attachplayerstream(stream: MediaStream, helperpeerid: string) {
  if (!streamhasmedia(stream)) {
    return false
  }
  if (
    ispresent(activestream) &&
    streammatches(activestream, stream) &&
    stream.getAudioTracks().length === activestream.getAudioTracks().length &&
    stream.getVideoTracks().length === activestream.getVideoTracks().length
  ) {
    return true
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
  if (ispresent(activecall)) {
    clearcalltracksynctimer(activecall)
  }
  mediaqueueattachvideosink(MEDIAQUEUE_PEER_LABEL, stream)
  mediaqueuesyncbroadcastaudio(stream, mediaqueuereadaudiogain())
  mediaqueuesetplayerlayerpending(false)
  const player = registerreadplayer()
  const videocount = stream.getVideoTracks().length
  const audiocount = stream.getAudioTracks().length
  apilog(
    SOFTWARE,
    player,
    `media stream from ${helperpeerid} v=${videocount} a=${audiocount}`,
  )
  if (audiocount === 0 && ispresent(activecall)) {
    const pc = activecall.peerConnection
    const receivers = pc?.getReceivers?.() ?? []
    const kinds = receivers
      .map((receiver) => {
        const track = receiver.track
        if (!track) {
          return 'none'
        }
        return `${track.kind}:${track.readyState}`
      })
      .join(',')
    apilog(
      SOFTWARE,
      player,
      `media no audio in stream; receivers=[${kinds || 'empty'}]`,
    )
  }
  return true
}

function synccallstream(call: MediaConnection, helperpeerid: string): boolean {
  if (activecall !== call) {
    return false
  }
  const merged = readcallstream(call)
  if (!ispresent(merged) || !streamhasmedia(merged)) {
    return false
  }
  return attachplayerstream(merged, helperpeerid)
}

function scheduletracksynctimeout(call: MediaConnection, helperpeerid: string) {
  clearcalltracksynctimer(call)
  const timer = setTimeout(() => {
    calltracksynctimers.delete(call)
    if (activecall !== call || ispresent(activestream)) {
      return
    }
    const player = registerreadplayer()
    const pc = call.peerConnection
    const ice = pc?.iceConnectionState ?? '?'
    const conn = pc?.connectionState ?? '?'
    apilog(
      SOFTWARE,
      player,
      `media no tracks from ${helperpeerid} after ${TRACK_SYNC_TIMEOUT_MS}ms ice=${ice} conn=${conn}`,
    )
  }, TRACK_SYNC_TIMEOUT_MS)
  calltracksynctimers.set(call, timer)
}

function wirecalltrackbridge(call: MediaConnection, helperpeerid: string) {
  clearpctracklistener(call)

  const ontrack = () => {
    if (activecall !== call) {
      return
    }
    queueMicrotask(() => {
      if (activecall !== call) {
        return
      }
      synccallstream(call, helperpeerid)
    })
  }

  const onconnectionstate = () => {
    if (activecall !== call) {
      return
    }
    const pc = call.peerConnection
    if (!pc) {
      return
    }
    if (
      pc.iceConnectionState === 'connected' ||
      pc.connectionState === 'connected'
    ) {
      synccallstream(call, helperpeerid)
    }
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
    if (!pcstatelisteners.has(call)) {
      pcstatelisteners.set(call, onconnectionstate)
      pc.addEventListener('iceconnectionstatechange', onconnectionstate)
      pc.addEventListener('connectionstatechange', onconnectionstate)
    }
    return synccallstream(call, helperpeerid)
  }

  if (trywire()) {
    return
  }

  let attempts = 0
  const poller = setInterval(() => {
    attempts += 1
    if (trywire() || activecall !== call || attempts > TRACK_SYNC_POLL_MAX) {
      clearcalltrackpoll(call)
    }
  }, TRACK_SYNC_POLL_MS)
  calltrackpollers.set(call, poller)
}

function wirecallhandlers(call: MediaConnection, helperpeerid: string) {
  const remote = readcallstream(call)
  if (ispresent(remote) && streamhasmedia(remote)) {
    attachplayerstream(remote, helperpeerid)
  }
  wirecalltrackbridge(call, helperpeerid)
  scheduletracksynctimeout(call, helperpeerid)
  call.on('stream', () => {
    if (activecall !== call) {
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
  call.on('error', (err: unknown) => {
    if (activecall !== call) {
      return
    }
    const player = registerreadplayer()
    const message =
      err &&
      typeof err === 'object' &&
      'message' in err &&
      typeof (err as { message: unknown }).message === 'string'
        ? (err as { message: string }).message
        : 'unknown error'
    apierror(SOFTWARE, player, 'media', `call ${helperpeerid}: ${message}`)
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
  mediaqueuesyncbroadcastaudio(undefined, mediaqueuereadaudiogain())
}

function headedtrace(message: string) {
  const fn = (
    globalThis as unknown as { __mqheadedlog?: (msg: string) => void }
  ).__mqheadedlog
  if (typeof fn === 'function') {
    fn(message)
  }
}

function tryplayerconnect(helperpeerid: string, gadgetboard: string): boolean {
  const trimmed = helperpeerid.trim()
  if (!trimmed || !gadgetboard) {
    return false
  }
  if (ispresent(activecall)) {
    if (ispresent(activestream)) {
      mediaqueuesetplayerlayerpending(false)
      return true
    }
    if (synccallstream(activecall, trimmed)) {
      mediaqueuesetplayerlayerpending(false)
      return true
    }
    teardownactivecall()
  }
  const player = registerreadplayer()
  apilog(SOFTWARE, player, `media connecting ${trimmed}`)
  headedtrace(`tryplayerconnect helper=${trimmed} board=${gadgetboard}`)
  const metadata = mediaqueuecallmetadata('player')
  const call = netterminalmediacall(trimmed, playerofferstream(), metadata)
  if (!ispresent(call)) {
    mediaqueuesetplayerlayerpending(true)
    headedtrace(
      `tryplayerconnect failed netterminalmediacall helper=${trimmed}`,
    )
    apierror(
      SOFTWARE,
      player,
      'media',
      `could not place call to ${trimmed} (netterminal peer not ready)`,
    )
    return false
  }
  mediaqueuesetplayerlayerpending(false)
  activecall = call
  wirecallhandlers(call, trimmed)
  headedtrace(`tryplayerconnect call open helper=${trimmed}`)
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
  const requested = gadgetboard.trim()
  const bound = mediaqueuereadboundboardid().trim()
  if (mediaqueueislistening() && requested && bound && requested !== bound) {
    mediaqueuedisconnect()
    return
  }
  const trimmed = helperpeerid.trim() || mediaqueuereadhelperpeerid().trim()
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
      if (synccallstream(activecall, helper)) {
        return
      }
      // Call still open but no usable remote media -- drop and re-dial.
      teardownactivecall()
    } else {
      return
    }
  }
  if (layer.helperpeerid && layer.board) {
    tryplayerconnect(layer.helperpeerid, layer.board)
  }
}

export function mediaqueuedisconnect() {
  teardownactivecall()
  mediaqueueclearplayerlayerstate()
}

/** Audio tracks from the active helper MediaStream, if any. */
export function mediaqueuereadaudiostream(): MediaStream | undefined {
  if (!ispresent(activestream)) {
    return undefined
  }
  if (activestream.getAudioTracks().length === 0) {
    return undefined
  }
  return activestream
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
