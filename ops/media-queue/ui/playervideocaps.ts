/** Match captureStream fps in streamcompositor.ts. */
export const MQ_VIDEO_MAX_FRAMERATE = 30

const DEFAULT_MQ_VIDEO_MAX_BITRATE_KBPS = 3000

const capspending = new WeakMap<RTCPeerConnection, Promise<void>>()

function readmaxbitratekbps(): number {
  let raw: string | undefined
  if (typeof window !== 'undefined') {
    const mqdev = (window as { mqdev?: { videomaxbitratekbps?: string } }).mqdev
    raw = mqdev?.videomaxbitratekbps
  }
  if (!raw) {
    return DEFAULT_MQ_VIDEO_MAX_BITRATE_KBPS
  }
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MQ_VIDEO_MAX_BITRATE_KBPS
  }
  return parsed
}

function playercapspcready(pc: RTCPeerConnection): boolean {
  const state = pc.connectionState
  const ice = pc.iceConnectionState
  return state === 'connected' || ice === 'connected' || ice === 'completed'
}

async function applyplayervideocapsinner(pc: RTCPeerConnection): Promise<void> {
  if (!playercapspcready(pc)) {
    return
  }
  const maxbitratebps = readmaxbitratekbps() * 1000
  for (const sender of pc.getSenders()) {
    if (sender.track?.kind !== 'video') {
      continue
    }
    const params = sender.getParameters()
    const encoding = params.encodings?.[0]
    if (!encoding) {
      continue
    }
    // Mutate the encoding returned by getParameters in place. Replacing the
    // object or encodings array drops read-only negotiated fields and Chrome
    // rejects the call with InvalidModificationError.
    encoding.maxBitrate = maxbitratebps
    encoding.maxFramerate = MQ_VIDEO_MAX_FRAMERATE
    await sender.setParameters(params)
  }
}

/** Apply outbound video encoder caps on a player PeerJS RTCPeerConnection. */
export function applyplayervideocaps(pc: RTCPeerConnection): Promise<void> {
  const prev = capspending.get(pc) ?? Promise.resolve()
  const next = prev
    .catch(function () {
      return undefined
    })
    .then(function () {
      return applyplayervideocapsinner(pc)
    })
  capspending.set(pc, next)
  return next
}
