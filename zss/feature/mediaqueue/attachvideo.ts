import type { MediaConnection } from 'peerjs'
import { apilog } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { mediaqueueprobeaudiostream } from 'zss/feature/mediaqueue/audioprobe'
import {
  mediaqueuebindremotevideo,
  mediaqueueclearremotevideo,
  mediaqueuewireaudiogestureretry,
} from 'zss/feature/mediaqueue/boardtvaudio'
import { MEDIAQUEUE_PEER_LABEL } from 'zss/feature/mediaqueue/constants'
import { mediaqueueregistervideosink } from 'zss/feature/mediaqueue/sinkregistry'
import { useMedia } from 'zss/gadget/media'
import { ispresent } from 'zss/mapping/types'

let remotevideo: HTMLVideoElement | undefined
let registered = false
let wiredstream: MediaStream | undefined
let streamtracklistener: ((evt: MediaStreamTrackEvent) => void) | undefined
let attachedtrackids = ''

function streamtrackids(stream: MediaStream): string {
  return stream
    .getTracks()
    .map((track) => `${track.kind}:${track.id}`)
    .sort()
    .join('|')
}

function clearstreamtracklistener() {
  if (ispresent(wiredstream) && ispresent(streamtracklistener)) {
    wiredstream.removeEventListener('addtrack', streamtracklistener)
  }
  wiredstream = undefined
  streamtracklistener = undefined
}

function wirestreamtracks(stream: MediaStream) {
  if (wiredstream === stream) {
    return
  }
  clearstreamtracklistener()
  wiredstream = stream
  streamtracklistener = (evt) => {
    if (!ispresent(remotevideo)) {
      return
    }
    const player = registerreadplayer()
    apilog(SOFTWARE, player, `media board TV track added: ${evt.track.kind}`)
    remotevideo.srcObject = stream
    mediaqueuebindremotevideo(remotevideo)
  }
  wiredstream.addEventListener('addtrack', streamtracklistener)
}

function clearremotevideo(peerkey: string) {
  if (ispresent(remotevideo)) {
    remotevideo.pause()
    remotevideo.srcObject = null
    remotevideo.remove()
    remotevideo = undefined
  }
  attachedtrackids = ''
  mediaqueueclearremotevideo()
  clearstreamtracklistener()
  useMedia.getState().setscreen(peerkey, undefined)
}

function attachremotestream(peerkey: string, stream: MediaStream) {
  const trackids = streamtrackids(stream)
  wirestreamtracks(stream)

  if (
    ispresent(remotevideo) &&
    remotevideo.srcObject instanceof MediaStream &&
    attachedtrackids === trackids &&
    document.body.contains(remotevideo)
  ) {
    mediaqueuebindremotevideo(remotevideo)
    return
  }

  clearremotevideo(peerkey)
  wirestreamtracks(stream)
  attachedtrackids = trackids

  if (stream.getVideoTracks().length === 0) {
    const player = registerreadplayer()
    apilog(
      SOFTWARE,
      player,
      `media board TV waiting for video track a=${stream.getAudioTracks().length}`,
    )
    return
  }

  const video = document.createElement('video')
  video.autoplay = true
  video.playsInline = true
  video.muted = false
  video.setAttribute('playsinline', '')
  video.style.display = 'none'
  document.body.appendChild(video)
  video.srcObject = stream
  remotevideo = video

  const publishvideo = () => {
    if (remotevideo !== video) {
      return
    }
    useMedia.getState().setscreen(peerkey, video)
  }

  video.addEventListener('loadeddata', publishvideo)
  video.addEventListener('playing', publishvideo)
  publishvideo()
  mediaqueuebindremotevideo(video)

  const player = registerreadplayer()
  apilog(
    SOFTWARE,
    player,
    `media board TV attached v=${stream.getVideoTracks().length} a=${stream.getAudioTracks().length} muted=${video.muted} vol=${video.volume}`,
  )
  // Category A: inbound PCM energy + element mute/volume.
  void mediaqueueprobeaudiostream(stream, 'mq-in').then((detail) => {
    apilog(
      SOFTWARE,
      player,
      `media audio probe ${detail} el.muted=${video.muted} el.vol=${video.volume}`,
    )
  })
}

export type MEDIAQUEUE_PLAYER_SINK_TEARDOWN = {
  call?: MediaConnection
  stream?: MediaStream
  peerkey?: string
}

/** Close player MediaConnection, stop tracks, and clear board TV sink. */
export function mediaqueueteardownplayersink(
  opts: MEDIAQUEUE_PLAYER_SINK_TEARDOWN = {},
) {
  const peerkey = opts.peerkey ?? MEDIAQUEUE_PEER_LABEL
  if (ispresent(opts.call)) {
    try {
      opts.call.close()
    } catch {
      // ignore
    }
  }
  if (ispresent(opts.stream)) {
    const tracks = opts.stream.getTracks()
    for (let i = 0; i < tracks.length; ++i) {
      tracks[i].stop()
    }
  }
  clearremotevideo(peerkey)
}

/** Wire MediaStream -> useMedia.screen + speaker audio. Call once from BoardTvSink mount. */
export function mediaqueueensurevideosink() {
  if (registered) {
    return
  }
  registered = true
  mediaqueuewireaudiogestureretry()
  mediaqueueregistervideosink((peerkey, stream) => {
    if (!ispresent(stream)) {
      clearremotevideo(peerkey)
      return
    }
    attachremotestream(peerkey, stream)
  })
}
