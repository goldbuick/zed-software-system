/**
 * Offline render length for ADSR scenarios — include full release tail.
 */
export function paritydurationwithrelease(
  gatesec: number,
  releasesec: number,
  marginsec = 1.5,
): number {
  return gatesec + releasesec + marginsec
}

/** Read release (seconds) from voiceconfigs `env` tuple if present. */
export function releasesecfromvoiceconfigs(
  voiceconfigs?: [string, string | number | number[]][],
): number {
  if (!voiceconfigs) {
    return 0.01
  }
  for (const [key, value] of voiceconfigs) {
    if (
      (key === 'env' || key === 'envelope') &&
      Array.isArray(value) &&
      value.length >= 4
    ) {
      const release = value[3]
      if (typeof release === 'number') {
        return release
      }
    }
  }
  return 0.01
}
