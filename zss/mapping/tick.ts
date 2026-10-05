// 18.2 ~~ 55 ms
// 1 cycle is two pit ticks
// 100 is 10 fps, 66.666 is ~15 fps, 50 is 20 fps, 40 is 25 fps  1000 / x = 15
// export const TICK_RATE = 100
export const TICK_RATE = 80
// export const TICK_RATE = 66.666
// export const TICK_RATE = 40
// export const TICK_RATE = 33.333

export const TICK_FPS = 1000 / TICK_RATE

/** App default for beat-aligned timing
 * (synth play queue, display interval, etc.). */
export const DEFAULT_BPM = 136

export const CYCLE_DEFAULT = 3

/** RoZZT CurrentTick wraps from 420 back to 1. */
export const CURRENT_TICK_WRAP = 420

/**
 * RoZZT cycle gate: (CurrentTick mod Cycle) = (stat index mod Cycle).
 * Cycle <= 0 never runs.
 */
export function rozzttickactive(
  currenttick: number,
  cycle: number,
  statindex: number,
): boolean {
  if (cycle <= 0) {
    return false
  }
  return currenttick % cycle === statindex % cycle
}

/** Advance RoZZT CurrentTick. Values above 420 become 1. */
export function rozztadvancecurrenttick(currenttick: number): number {
  const next = currenttick + 1
  return next > CURRENT_TICK_WRAP ? 1 : next
}

export function waitfor(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
