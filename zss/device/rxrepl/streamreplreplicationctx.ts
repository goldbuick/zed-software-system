import type { DEVICELIKE } from '../api'

export type StreamreplReplCtx = {
  device: DEVICELIKE
  getOwnPlayer: () => string
}

let replctx: StreamreplReplCtx | null = null

export function streamreplreplicationctxset(c: StreamreplReplCtx | null): void {
  replctx = c
}

export function streamreplreplicationctxget(): StreamreplReplCtx | null {
  return replctx
}
