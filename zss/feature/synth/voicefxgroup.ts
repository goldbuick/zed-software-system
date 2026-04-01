/**
 * Play bus is always index 0. Any other index (1–3 legacy, or canonical 1 for bg+TTS)
 * selects the second bus. Firmware must pass 0 for both former “play” FX slots.
 */
export function canonicalvoicefxgroupindex(idx: number): 0 | 1 {
  if (idx === 0) {
    return 0
  }
  if (idx < 0) {
    return 0
  }
  return 1
}
