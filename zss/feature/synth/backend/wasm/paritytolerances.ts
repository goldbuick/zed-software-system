/** Patches with no Tone archive implementation — excluded from Tone gate count. */
export const TONE_PARITY_EXCLUDED = ['noise-c4', 'hollow-c4'] as const

export type PARITY_TOLERANCE_PROFILE = {
  rmsdbtol: number
  peakdbtol: number
  centroidhztol: number
  bandratiotol: number
}

const LOOSE: PARITY_TOLERANCE_PROFILE = {
  rmsdbtol: 2,
  peakdbtol: 3,
  centroidhztol: 600,
  bandratiotol: 0.18,
}

const TIGHT: PARITY_TOLERANCE_PROFILE = {
  rmsdbtol: 1,
  peakdbtol: 2,
  centroidhztol: 250,
  bandratiotol: 0.08,
}

const NOISE: PARITY_TOLERANCE_PROFILE = {
  rmsdbtol: 2,
  peakdbtol: 3,
  centroidhztol: 900,
  bandratiotol: 0.22,
}

export function paritytolerancesfor(patchid: string): PARITY_TOLERANCE_PROFILE {
  if (patchid.startsWith('master-')) {
    return TIGHT
  }
  if (patchid.startsWith('drum')) {
    return LOOSE
  }
  if (
    patchid.includes('noise') ||
    patchid.includes('retro') ||
    patchid.includes('buzz') ||
    patchid.includes('clang') ||
    patchid.includes('metallic')
  ) {
    return NOISE
  }
  if (
    patchid.includes('algo') ||
    patchid.includes('bells') ||
    patchid.includes('fm') ||
    patchid.includes('fat') ||
    patchid.includes('am')
  ) {
    return LOOSE
  }
  if (patchid.startsWith('echo') || patchid.startsWith('reverb')) {
    return LOOSE
  }
  return TIGHT
}
