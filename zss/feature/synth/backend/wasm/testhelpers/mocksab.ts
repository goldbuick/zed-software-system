import type { SabEngine } from '../../shared/sabengine'
import { resetwasmsabregistry, wasmsabsnapshot } from '../sabpush'

export function createmocksabengine() {
  resetwasmsabregistry()
  let clock = 0
  const engine = {
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
  } as unknown as SabEngine & { advance(ms: number): void }
  return {
    engine,
    getclock: () => clock,
    snapshot: wasmsabsnapshot,
  }
}
