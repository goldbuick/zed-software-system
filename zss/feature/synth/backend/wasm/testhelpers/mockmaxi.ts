import { resetwasmsabregistry, wasmsabsnapshot } from '../sabpush'

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
  }
  return {
    maxi,
    getclock: () => clock,
    snapshot: wasmsabsnapshot,
  }
}
