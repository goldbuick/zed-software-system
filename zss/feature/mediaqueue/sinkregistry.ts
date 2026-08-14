/** Callback registry so receive.ts never imports gadget/media (Jest-safe CLI). */

export type MEDIAQUEUE_VIDEO_SINK = (
  peerkey: string,
  stream: MediaStream | undefined,
) => void

let videosink: MEDIAQUEUE_VIDEO_SINK | undefined

export function mediaqueueregistervideosink(fn: MEDIAQUEUE_VIDEO_SINK) {
  videosink = fn
}

export function mediaqueueattachvideosink(
  peerkey: string,
  stream: MediaStream | undefined,
) {
  videosink?.(peerkey, stream)
}
