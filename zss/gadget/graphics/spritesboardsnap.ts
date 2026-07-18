import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

/**
 * Snap (no lerp) when:
 * - slot is new,
 * - gadget board just changed (including a follow-up frame for coord race),
 * - position jumps more than one cell (teleport / edge / #goto),
 * - or a full board-edge delta.
 *
 * Same-board walking stays 1 cell and still lerps.
 */
export function spriteshouldsnapposition(
  slotempty: boolean,
  boardsnap: boolean,
  deltax = 0,
  deltay = 0,
): boolean {
  if (slotempty || boardsnap) {
    return true
  }
  const adx = Math.abs(deltax)
  const ady = Math.abs(deltay)
  if (adx > 1 || ady > 1) {
    return true
  }
  return adx >= BOARD_WIDTH - 1 || ady >= BOARD_HEIGHT - 1
}
