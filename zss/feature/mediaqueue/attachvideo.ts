import type { MediaConnection } from 'peerjs'
import {
  mediaqueueattachremoteaudio,
  mediaqueueclearremoteaudio,
  mediaqueuewireaudiogestureretry,
} from 'zss/feature/mediaqueue/boardtvaudio'
import { MEDIAQUEUE_PEER_LABEL } from 'zss/feature/mediaqueue/constants'
import { mediaqueueregistervideosink } from 'zss/feature/mediaqueue/sinkregistry'
import { useMedia } from 'zss/gadget/media'
import { ispresent } from 'zss/mapping/types'

let remotevideo: HTMLVideoElement | undefined
let registered = false
let videogesturewired = false

function resumeremotevideo() {
  if (!ispresent(remotevideo) || !remotevideo.paused) {
    return
  }
  void remotevideo.play().catch(() => {
    // Still blocked until a stronger user gesture.
  })
}

function wirevideogestureretry() {
  if (videogesturewired || typeof window === 'undefined') {
    return
  }
  videogesturewired = true
  window.addEventListener('keydown', resumeremotevideo, { capture: true })
  window.addEventListener('pointerdown', resumeremotevideo, { capture: true })
  window.addEventListener('click', resumeremotevideo, { capture: true })
}

function clearremotevideo(peerkey: string) {
  if (ispresent(remotevideo)) {
    remotevideo.srcObject = null
    remotevideo.remove()
    remotevideo = undefined
  }
  mediaqueueclearremoteaudio()
  useMedia.getState().setscreen(peerkey, undefined)
}

function attachremotestream(peerkey: string, stream: MediaStream) {
  clearremotevideo(peerkey)
  const videotracks = stream.getVideoTracks()
  const audiotracks = stream.getAudioTracks()
  if (videotracks.length > 0) {
    const video = document.createElement('video')
    video.autoplay = true
    video.playsInline = true
    video.muted = true
    video.setAttribute('playsinline', '')
    video.style.display = 'none'
    document.body.appendChild(video)
    const videostream = new MediaStream(videotracks)
    video.srcObject = videostream
    const publishvideo = () => {
      if (remotevideo !== video) {
        return
      }
      wirevideogestureretry()
      useMedia.getState().setscreen(peerkey, video)
    }
    video.addEventListener('loadeddata', publishvideo)
    video.addEventListener('playing', publishvideo)
    for (let i = 0; i < videotracks.length; ++i) {
      videotracks[i].addEventListener('unmute', publishvideo, { once: true })
    }
    publishvideo()
    void video.play().catch(() => {
      // Autoplay may wait for a user gesture; texture still updates once playing.
    })
    remotevideo = video
  }
  mediaqueueattachremoteaudio(audiotracks)
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
