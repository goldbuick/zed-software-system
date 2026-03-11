/**
 * Convert a cell value (string or number) to the numeric value used for rendering.
 * Used only at the Tiles render boundary and when persisting/reading char as number.
 * - string: one grapheme per cell; use first codepoint for atlas lookup.
 * - number: charset index (0-255) or legacy codepoint (>255).
 */
export function celltorendervalue(cell: string | number): number {
  if (typeof cell === 'string') {
    return cell.codePointAt(0) ?? 0
  }
  return cell
}
