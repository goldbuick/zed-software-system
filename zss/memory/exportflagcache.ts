/**
 * Flag owners that are rebuildable / ephemeral, not durable progress.
 * Dropped from URL / book export.
 *
 * Render caches: `_gadget`, `_layers`, legacy `gadgetstore`.
 * Ephemeral chips: `_cli_chip`, `_run_chip`, `_loader_chip`, `_draw_chip`
 * (plus legacy `draw_*_chip` owners from the old draw id shape).
 */

const EXPORT_SKIP_FLAG_OWNER_EXACT = ['gadgetstore'] as const

const EXPORT_SKIP_FLAG_OWNER_SUFFIXES = [
  '_gadget',
  '_layers',
  '_cli_chip',
  '_run_chip',
  '_loader_chip',
  '_draw_chip',
] as const

/** True when this flag owner must not be written into a persisted book export. */
export function memoryexportshouldskipflagowner(owner: string): boolean {
  if (!owner) {
    return true
  }
  for (let i = 0; i < EXPORT_SKIP_FLAG_OWNER_EXACT.length; ++i) {
    if (owner === EXPORT_SKIP_FLAG_OWNER_EXACT[i]) {
      return true
    }
  }
  for (let i = 0; i < EXPORT_SKIP_FLAG_OWNER_SUFFIXES.length; ++i) {
    if (owner.endsWith(EXPORT_SKIP_FLAG_OWNER_SUFFIXES[i])) {
      return true
    }
  }
  // Legacy draw chip ids were `draw_${type}_${readid}` -> `draw_*_chip`
  if (owner.startsWith('draw_') && owner.endsWith('_chip')) {
    return true
  }
  return false
}
