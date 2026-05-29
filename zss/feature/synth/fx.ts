/** Shared FX volume helper — matches archived Tone chain. */
export function volumetodb(value: number) {
  return 20 * Math.log10(value) - 35
}
