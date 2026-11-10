/**
 * TS mirror of `compressorskneedb` in zss_main.cpp — locks soft-knee sign and
 * continuity with the hard knee at +halfknee.
 */
export function compressorskneedb(
  dbover: number,
  ratio: number,
  kneedb: number,
): number {
  if (kneedb <= 0) {
    if (dbover <= 0) {
      return 0
    }
    return dbover - dbover / ratio
  }
  const halfknee = kneedb * 0.5
  if (dbover <= -halfknee) {
    return 0
  }
  const slope = 1 - 1 / ratio
  if (dbover < halfknee) {
    const x = dbover + halfknee
    return ((x * x) / (2 * kneedb)) * slope
  }
  return dbover * slope
}
