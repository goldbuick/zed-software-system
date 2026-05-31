import type { MAYBE } from 'zss/mapping/types'

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- Window augmentation requires interface
  interface Window {
    __ZSS_MAXIM_AUDIO_CONTEXT__?: AudioContext
  }
}

let unlockedcontext: MAYBE<AudioContext>
let liveenginecontext: MAYBE<AudioContext>

/** Call synchronously from a user-gesture handler before any await. */
export function unlockaudiocontext(): AudioContext {
  unlockedcontext ??= new AudioContext()
  void unlockedcontext.resume()
  return unlockedcontext
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
