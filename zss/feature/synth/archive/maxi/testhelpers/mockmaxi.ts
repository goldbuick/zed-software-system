import type { SabEngine } from '../../../backend/shared/sabengine'
import {
  resetwasmsabregistry,
  wasmsabsnapshot,
} from '../../../backend/wasm/sabpush'

export function createmockmaxi() {
  resetwasmsabregistry()
  let clock = 0
  const maxi = {
    audioContext: {
      get currentTime() {
        return clock
      },
    },
    send: () => {},
    audioWorkletNode: {
      port: {
        postMessage: () => {},
      },
    },
    advance(ms: number) {
      clock += ms / 1000
    },
  } as SabEngine & { advance(ms: number): void }
  return {
    maxi,
    getclock: () => clock,
    snapshot: wasmsabsnapshot,
  }
}
