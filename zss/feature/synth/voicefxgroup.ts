/** FX bus index: 0 play 0–1, 1 play 2–3, 2 bgplay, 3 TTS (matches echo1–4). */
export function canonicalvoicefxgroupindex(idx: number): 0 | 1 | 2 | 3 {
  if (idx < 0) {
    return 0
  }
  if (idx > 3) {
    return 3
  }
  return idx as 0 | 1 | 2 | 3
}

/** Play voice index (0–7) → FX bus 0–2. */
export function voiceindexfxgroup(voicei: number): 0 | 1 | 2 {
  if (voicei < 2) {
    return 0
  }
  if (voicei < 4) {
    return 1
  }
  return 2
}
