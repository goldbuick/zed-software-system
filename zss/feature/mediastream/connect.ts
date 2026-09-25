import type { DataConnection, MediaConnection } from 'peerjs'
import { apierror, apilog } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { synthbroadcastdestination } from 'zss/device/synth'
import { readbroadcastactive } from 'zss/feature/broadcast/broadcastactive'
import { mediaqueuereadaudiostream } from 'zss/feature/mediaqueue/playerconnect'
import {
  readmediastreamboundpeerid,
  readmediastreamstreaming,
  setmediastreamboundpeerid,
  setmediastreamstreaming,
} from 'zss/feature/mediastream/active'
import {
  MEDIASTREAM_PROTOCOL,
  ismediastreammessage,
  withmsprefix,
  type MEDIASTREAM_MESSAGE,
} from 'zss/feature/mediastream/protocol'
import {
  netterminaldataconnect,
  netterminalmediacall,
  readnetworkpeerid,
} from 'zss/feature/netterminal'
import { MAYBE, ispresent } from 'zss/mapping/types'

let helperconn: MAYBE<DataConnection>
let capturecall: MAYBE<MediaConnection>
let capturestream: MAYBE<MediaStream>
let listenplayer = ''

function sendtocompanion(message: MEDIASTREAM_MESSAGE) {
  if (!ispresent(helperconn) || !helperconn.open) {
    return
  }
  void helperconn.send(message)
}

export function mediastreamsendstop() {
  sendtocompanion({ type: 'mediastream:stop' })
  setmediastreamstreaming(false)
  teardowncapture()
}

function teardowncapture() {
  teardowncapturecallonly()
  if (ispresent(capturestream)) {
    for (const track of capturestream.getTracks()) {
      track.stop()
    }
  }
  capturestream = undefined
}

function teardowncapturecallonly() {
  if (ispresent(capturecall)) {
    try {
      capturecall.close()
    } catch {
      // ignore
    }
  }
  capturecall = undefined
}

function handlemessage(raw: unknown) {
  if (!ismediastreammessage(raw)) {
    return
  }
  if (raw.type === 'mediastream:bindack' && raw.ok) {
    apilog(SOFTWARE, listenplayer, `media-stream bound ${raw.peerid}`)
  }
  if (raw.type === 'mediastream:golive') {
    if (readbroadcastactive()) {
      apierror(
        SOFTWARE,
        listenplayer,
        'broadcast',
        'WHIP broadcast is live; stop it before media-stream Start',
      )
      sendtocompanion({ type: 'mediastream:stop' })
      return
    }
    setmediastreamstreaming(true)
    void pushcapture()
  }
  if (raw.type === 'mediastream:stop') {
    setmediastreamstreaming(false)
    teardowncapture()
  }
  if (raw.type === 'mediastream:status' && !raw.streaming) {
    setmediastreamstreaming(false)
    teardowncapture()
  }
}

function pushcapture() {
  const peerid = readmediastreamboundpeerid()
  if (!peerid) {
    return
  }
  const stream = buildcapturestream()
  if (!ispresent(stream)) {
    apierror(
      SOFTWARE,
      listenplayer,
      'broadcast',
      'media-stream capture unavailable',
    )
    return
  }
  capturestream = stream
  teardowncapturecallonly()
  const call = netterminalmediacall(peerid, stream)
  if (!ispresent(call)) {
    apierror(
      SOFTWARE,
      listenplayer,
      'broadcast',
      'media-stream MediaConnection failed',
    )
    return
  }
  capturecall = call
  call.on('close', () => {
    if (capturecall === call) {
      capturecall = undefined
    }
  })
}

function buildcapturestream(): MAYBE<MediaStream> {
  if (typeof document === 'undefined') {
    return undefined
  }
  const canvas = document.querySelector('canvas') as HTMLCanvasElement | null
  if (!ispresent(canvas)) {
    return undefined
  }
  const stream = canvas.captureStream(30)
  const audio = synthbroadcastdestination()
  if (ispresent(audio)) {
    for (const track of audio.stream.getAudioTracks()) {
      stream.addTrack(track)
    }
  }
  const tv = mediaqueuereadaudiostream()
  if (ispresent(tv)) {
    for (const track of tv.getAudioTracks()) {
      stream.addTrack(track.clone())
    }
  }
  return stream
}

export function mediastreamisbound(): boolean {
  return Boolean(readmediastreamboundpeerid())
}

export function mediastreambind(player: string, peerid: string): void {
  const trimmed = withmsprefix(peerid)
  if (!trimmed) {
    apierror(SOFTWARE, player, 'broadcast', 'usage: broadcast stream <peerid>')
    return
  }
  listenplayer = player
  setmediastreamboundpeerid(trimmed)
  if (ispresent(helperconn)) {
    try {
      helperconn.close()
    } catch {
      // ignore
    }
    helperconn = undefined
  }
  const self = readnetworkpeerid()
  if (!self) {
    apierror(SOFTWARE, player, 'broadcast', 'network peer not ready')
    return
  }
  const conn = netterminaldataconnect(trimmed)
  if (!ispresent(conn)) {
    apierror(SOFTWARE, player, 'broadcast', 'could not connect to media-stream')
    return
  }
  helperconn = conn
  conn.on('open', () => {
    sendtocompanion({
      type: 'mediastream:hello',
      protocol: MEDIASTREAM_PROTOCOL,
      role: 'cafe',
      peerid: self,
    })
    apilog(SOFTWARE, player, `media-stream connecting ${trimmed}`)
  })
  conn.on('data', handlemessage)
  conn.on('close', () => {
    if (helperconn === conn) {
      helperconn = undefined
    }
  })
  conn.on('error', () => {
    apierror(SOFTWARE, player, 'broadcast', 'media-stream data connection error')
  })
}

export function mediastreamstopfromcafe(player: string): boolean {
  if (!readmediastreamstreaming()) {
    return false
  }
  mediastreamsendstop()
  apilog(SOFTWARE, player, 'media-stream stop requested')
  return true
}

export function mediastreamstreamingactive(): boolean {
  return readmediastreamstreaming()
}
