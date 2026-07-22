import { memoryreadhalt, memorywritehalt } from 'zss/memory/session'

/** Soft halt latch while zedsync is active (NPCs pause; players still tick). */
let zedsynchalthold = false
let zedsynchaltprior = false

/** Save prior halt and force halt on. Idempotent while already holding. */
export function setzedsynchalt(): void {
  if (zedsynchalthold) {
    return
  }
  zedsynchaltprior = memoryreadhalt()
  memorywritehalt(true)
  zedsynchalthold = true
}

/** Restore halt from before the first setzedsynchalt in this hold session. */
export function clearzedsynchalt(): void {
  if (!zedsynchalthold) {
    return
  }
  memorywritehalt(zedsynchaltprior)
  zedsynchalthold = false
}

/** True while this process owns a zedsync soft-halt hold. */
export function iszedsynchaltholding(): boolean {
  return zedsynchalthold
}

/** Test hook -- drop hold without touching MEMORY.halt (tests reset session). */
export function resetzedsynchaltfortest(): void {
  zedsynchalthold = false
  zedsynchaltprior = false
}
