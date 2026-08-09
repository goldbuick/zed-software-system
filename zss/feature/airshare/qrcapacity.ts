import { AIRSHARE_HEADER_SIZE } from 'zss/feature/airshare/protocol'

/** Approximate QR byte-mode capacities for ECC L (ISO/IEC 18004). */
const QR_BYTE_CAPACITY_L: Record<number, number> = {
  10: 271,
  15: 523,
  20: 858,
  25: 1273,
  27: 1465,
  30: 1732,
  35: 2303,
  40: 2953,
}

/** Default target: version 27 ECC L (~1465 bytes). */
export const AIRSHARE_DEFAULT_QR_VERSION = 27
export const AIRSHARE_DEFAULT_TX_FPS = 15

export function qrbylcapacity(version: number): number {
  const exact = QR_BYTE_CAPACITY_L[version]
  if (exact) {
    return exact
  }
  let best = 0
  const versions = Object.keys(QR_BYTE_CAPACITY_L).map(Number)
  for (let i = 0; i < versions.length; ++i) {
    const v = versions[i]
    if (v <= version && QR_BYTE_CAPACITY_L[v] > best) {
      best = QR_BYTE_CAPACITY_L[v]
    }
  }
  return best
}

export function airshareblocksizeforversion(version = AIRSHARE_DEFAULT_QR_VERSION): number {
  const capacity = qrbylcapacity(version)
  const blocksize = capacity - AIRSHARE_HEADER_SIZE
  if (blocksize < 64) {
    throw new Error('airshare QR capacity too small for header')
  }
  return blocksize
}
