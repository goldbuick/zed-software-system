import type {
  WanixTermScrollState,
  WanixTermScrollTarget,
  WanixTermTileBuffer,
} from 'zss/device/wanixclient/state'
import { readwanixtermtotallines } from 'zss/device/wanixclient/wanixtermtext'

export function readwanixtermscrollstate(
  buffer: WanixTermTileBuffer,
  visibleheight: number,
  scrolloffset: number,
): WanixTermScrollState {
  const totallines = readwanixtermtotallines(buffer)
  const maxoffset = Math.max(0, totallines - visibleheight)
  const clampedoffset = Math.min(Math.max(0, scrolloffset), maxoffset)
  const startline = Math.max(0, totallines - visibleheight - clampedoffset)
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
