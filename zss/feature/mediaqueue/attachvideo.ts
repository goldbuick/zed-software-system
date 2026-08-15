import { mediaqueueregistervideosink } from 'zss/feature/mediaqueue/sinkregistry'
import { useMedia } from 'zss/gadget/media'
import { ispresent } from 'zss/mapping/types'

let remotevideo: HTMLVideoElement | undefined
let registered = false

function clearremotevideo(peerkey: string) {
  if (ispresent(remotevideo)) {
    remotevideo.srcObject = null
    remotevideo.remove()
    remotevideo = undefined
  }
  useMedia.getState().setscreen(peerkey, undefined)
}

function attachremotestream(peerkey: string, stream: MediaStream) {
  clearremotevideo(peerkey)
  const video = document.createElement('video')
  video.autoplay = true
  video.playsInline = true
  video.muted = true
  video.srcObject = stream
  void video.play().catch(() => {
    // Autoplay may wait for a user gesture; texture still updates once playing.
  })
  remotevideo = video
  useMedia.getState().setscreen(peerkey, video)
}

/** Wire MediaStream -> useMedia.screen. Call once from BoardTvSink mount. */
export function mediaqueueensurevideosink() {
  if (registered) {
    return
  }
  registered = true
  mediaqueueregistervideosink((peerkey, stream) => {
    if (!ispresent(stream)) {
      clearremotevideo(peerkey)
      return
    }
    attachremotestream(peerkey, stream)
  })
}
