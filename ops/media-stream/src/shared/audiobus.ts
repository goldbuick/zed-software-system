/** Pure VOD-bus helper (no DOM) for unit tests and shared checks. */

export function vodexcludesboardtv(
  vodtrackids: string[],
  boardtvtrackids: string[],
): boolean {
  const set = new Set(vodtrackids)
  for (const id of boardtvtrackids) {
    if (set.has(id)) {
      return false
    }
  }
  return true
}
