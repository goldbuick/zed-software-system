import type { MS_BRIDGE, MS_DEV_BRIDGE } from '../src/shared/ipc'

declare global {
  interface Window {
    ms: MS_BRIDGE
    msdev: MS_DEV_BRIDGE
    msframe: {
      write: (payload: {
        destid?: string
        rgba: ArrayBuffer
        width: number
        height: number
      }) => Promise<{ ok: boolean }>
    }
  }
}

export {}
