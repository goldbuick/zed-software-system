/** Callback registry so receive.ts never imports gadget/media (Jest-safe CLI). */

import { ispresent } from 'zss/mapping/types'

export type MEDIAQUEUE_VIDEO_SINK = (
  peerkey: string,
  stream: MediaStream | undefined,
) => void

let videosink: MEDIAQUEUE_VIDEO_SINK | undefined
const pendingstreams = new Map<string, MediaStream | undefined>()

export function mediaqueueregistervideosink(fn: MEDIAQUEUE_VIDEO_SINK) {
  videosink = fn
  for (const [peerkey, stream] of pendingstreams) {
    fn(peerkey, stream)
  }
}

export function mediaqueueattachvideosink(
  peerkey: string,
  stream: MediaStream | undefined,
) {
  if (ispresent(stream)) {
    pendingstreams.set(peerkey, stream)
  } else {
    pendingstreams.delete(peerkey)
  }
  videosink?.(peerkey, stream)
}
