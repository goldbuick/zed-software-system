import type {
  WanixTermScrollState,
  WanixTermScrollTarget,
  WanixTermTileBuffer,
} from 'zss/device/wanixclient/state'
import { readwanixtermtotallines } from 'zss/device/wanixclient/wanixtermtext'

/**
 * Live view anchors on the guest cursor, not the bottom of the allocated grid.
 * Short task stdout (e.g. "Alpha run\\n" on row 0 of an 80x24 grid) must stay
 * visible in the attach panel; pinning to totallines scrolled that line off-screen.
 */
export function readwanixtermscrollstate(
  buffer: WanixTermTileBuffer,
  visibleheight: number,
  scrolloffset: number,
): WanixTermScrollState {
  const totallines = readwanixtermtotallines(buffer)
  const scrollbackrows = buffer.scrollbackrows ?? 0
  const cursorrow = Math.max(
    0,
    Math.min(buffer.cursory, Math.max(0, buffer.rows - 1)),
  )
  const cursorline = scrollbackrows + cursorrow
  // Inclusive end of the live region (line after the cursor cell).
  const liveend = Math.min(totallines, Math.max(1, cursorline + 1))
  const maxoffset = Math.max(0, liveend - visibleheight)
  const clampedoffset = Math.min(Math.max(0, scrolloffset), maxoffset)
  const startline = Math.max(0, liveend - visibleheight - clampedoffset)
  return {
    totallines,
    maxoffset,
    startline,
    atliveline: clampedoffset === 0,
    clampedoffset,
  }
}

export function scrollwanixtermby(
  offset: number,
  delta: number,
  maxoffset: number,
): number {
  return Math.min(maxoffset, Math.max(0, offset + delta))
}

export function scrollwanixtermto(
  _offset: number,
  target: WanixTermScrollTarget,
  maxoffset: number,
): number {
  return target === 'top' ? maxoffset : 0
}
