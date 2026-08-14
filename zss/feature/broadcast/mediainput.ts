import { resolvewhependpoint } from 'zss/feature/broadcast/mediainputaliases'
import { WhepTransport } from 'zss/feature/broadcast/wheptransport'

export type MediaStartPayload = {
  kind: 'whep'
  endpoint: string
  bearer: string
}

export function parsemediastartpayload(
  data: unknown,
): MediaStartPayload | undefined {
  if (!data || typeof data !== 'object') {
    return undefined
  }
  const record = data as Record<string, unknown>
  if (record.kind !== 'whep') {
    return undefined
  }
  if (typeof record.endpoint !== 'string') {
    return undefined
  }
  const bearer = typeof record.bearer === 'string' ? record.bearer : ''
  const endpoint = resolvewhependpoint(record.endpoint)
  if (!endpoint) {
    return undefined
  }
  return {
    kind: 'whep',
    endpoint,
    bearer,
  }
}

let currentvideo: HTMLVideoElement | undefined
const videolisteners = new Set<() => void>()

function setcurrentvideo(video: HTMLVideoElement | undefined) {
  currentvideo = video
  for (const listener of videolisteners) {
    listener()
  }
}

export function readmediainputvideo(): HTMLVideoElement | undefined {
  return currentvideo
}

export function subscribemediainputvideo(onstorechange: () => void) {
  videolisteners.add(onstorechange)
  return () => {
    videolisteners.delete(onstorechange)
  }
}

function makevideoelement(): HTMLVideoElement {
  const video = document.createElement('video')
  video.autoplay = true
  video.playsInline = true
  video.muted = false
  video.setAttribute('playsinline', 'true')
  return video
}

export class MediaInputClient {
  private readonly whep = new WhepTransport()
  private video: HTMLVideoElement | undefined
  private onconnectionstatechange: ((state: string) => void) | undefined
  private onerror: ((message: string) => void) | undefined

  constructor() {
    this.whep.sethandlers({
      onconnectionstatechange: (state) => {
        this.onconnectionstatechange?.(state)
      },
      onerror: (message) => {
        this.onerror?.(message)
      },
      ontrack: (event) => {
        const video = this.video
        if (!video) {
          return
        }
        if (event.streams[0]) {
          video.srcObject = event.streams[0]
        } else {
          const stream =
            (video.srcObject as MediaStream | null) ?? new MediaStream()
          stream.addTrack(event.track)
          video.srcObject = stream
        }
        void video.play().catch(() => {
          /* autoplay may require the CLI keystroke already in progress */
        })
        setcurrentvideo(video)
      },
    })
  }

  sethandlers(handlers: {
    onconnectionstatechange?: (state: string) => void
    onerror?: (message: string) => void
  }) {
    this.onconnectionstatechange = handlers.onconnectionstatechange
    this.onerror = handlers.onerror
  }

  getvideo(): HTMLVideoElement | undefined {
    return this.video
  }

  async start(payload: MediaStartPayload) {
    await this.stop()
    const video = makevideoelement()
    this.video = video
    setcurrentvideo(video)
    await this.whep.start({
      endpoint: payload.endpoint,
      bearer: payload.bearer,
    })
  }

  async stop() {
    setcurrentvideo(undefined)
    const video = this.video
    this.video = undefined
    if (video) {
      video.pause()
      video.srcObject = null
    }
    await this.whep.stop()
  }
}

export function createmediainputclient(): MediaInputClient {
  return new MediaInputClient()
}
