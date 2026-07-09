import type { WanixTermTileBuffer } from 'zss/feature/wanix/wanixtermbuffer'
import { readwanixtermtotallines } from 'zss/feature/wanix/wanixtermtext'

export type WanixTermScrollState = {
  totallines: number
  maxoffset: number
  startline: number
  atliveline: boolean
  clampedoffset: number
}

export type WanixTermScrollTarget = 'top' | 'live'

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
