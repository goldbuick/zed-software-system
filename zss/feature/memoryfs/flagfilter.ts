/**
 * Runtime / projection flag owners that must not appear under memoryfs flags/.
 * Suffixes match zss/mapping/guid createchipid / createtrackingid / etc.
 */
const MEMORYFS_EXCLUDED_FLAG_OWNER_SUFFIXES = [
  '_chip',
  '_tracking',
  '_layers',
  '_synth',
  '_gadget',
] as const

export function memoryfsshouldmirrorflagowner(owner: string): boolean {
  if (!owner) {
    return false
  }
  for (let i = 0; i < MEMORYFS_EXCLUDED_FLAG_OWNER_SUFFIXES.length; ++i) {
    if (owner.endsWith(MEMORYFS_EXCLUDED_FLAG_OWNER_SUFFIXES[i])) {
      return false
    }
  }
  return true
}
