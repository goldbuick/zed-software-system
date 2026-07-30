import type { MAYBE } from 'zss/mapping/types'

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- Window augmentation requires interface
  interface Window {
    __ZSS_MAXIM_AUDIO_CONTEXT__?: AudioContext
  }
}

let unlockedcontext: MAYBE<AudioContext>
let liveenginecontext: MAYBE<AudioContext>

/** Same-turn silent play so Firefox treats the gesture as audio unlock. */
function playsilentunlockbuffer(ctx: AudioContext) {
  try {
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start(0)
  } catch {
    // createBuffer / start can throw in incomplete test mocks
  }
}

/** Call synchronously from a user-gesture handler before any await. */
export function unlockaudiocontext(): AudioContext {
  unlockedcontext ??= new AudioContext()
  const ctx = unlockedcontext
  if (ctx.state !== 'running') {
    void ctx.resume()
    playsilentunlockbuffer(ctx)
  }
  return ctx
}

export function getunlockedaudiocontext(): MAYBE<AudioContext> {
  return unlockedcontext
}

/** Prefer live engine context when set (e.g. archived Maximilian boot). */
export function getliveaudiocontext(): MAYBE<AudioContext> {
  return liveenginecontext ?? unlockedcontext
}

export function setliveaudiocontext(ctx: MAYBE<AudioContext>) {
  liveenginecontext = ctx
}

/** Test hook — clear module unlock state between Jest cases. */
export function resetunlockedaudiocontextfortests() {
  unlockedcontext = undefined
  liveenginecontext = undefined
}
