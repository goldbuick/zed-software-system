import { mediaqueueregistervideosink } from 'zss/feature/mediaqueue/sinkregistry'
import { useMedia } from 'zss/gadget/media'
import { ispresent } from 'zss/mapping/types'

let remotevideo: HTMLVideoElement | undefined
let remoteaudio: HTMLAudioElement | undefined
let registered = false

function clearremotevideo(peerkey: string) {
  if (ispresent(remotevideo)) {
    remotevideo.srcObject = null
    remotevideo.remove()
    remotevideo = undefined
  }
  if (ispresent(remoteaudio)) {
    remoteaudio.srcObject = null
    remoteaudio.remove()
    remoteaudio = undefined
  }
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
    video.srcObject = new MediaStream(videotracks)
    void video.play().catch(() => {
      // Autoplay may wait for a user gesture; texture still updates once playing.
    })
    remotevideo = video
    useMedia.getState().setscreen(peerkey, video)
  }
  if (audiotracks.length > 0) {
    const audio = document.createElement('audio')
    audio.autoplay = true
    audio.srcObject = new MediaStream(audiotracks)
    void audio.play().catch(() => {
      // Autoplay may wait for a user gesture after #media bind.
    })
    remoteaudio = audio
  }
}

/** Wire MediaStream -> useMedia.screen + speaker audio. Call once from BoardTvSink mount. */
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
