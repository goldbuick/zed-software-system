// 100 is 10 fps, 66.666 is ~15 fps, 50 is 20 fps, 40 is 25 fps  1000 / x = 15
export const TICK_RATE = 66.666
// const TICK_RATE = 33.333
// export const TICK_RATE = 40
export const TICK_FPS = Math.round(1000 / TICK_RATE)
export const CYCLE_DEFAULT = 3

export function waitfor(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
