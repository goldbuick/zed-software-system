/**
 * Stub for maath/misc - Node ESM can't resolve maath's .jsx files.
 * degToRad: degrees to radians. radToDeg: radians to degrees.
 */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
