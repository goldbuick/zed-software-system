export const DAISY_WASM_BASE = '/wasm/daisy'

export function daisyasseturl(filename: string): string {
  const base = DAISY_WASM_BASE.replace(/\/$/, '')
  return new URL(`${base}/${filename}`, window.location.href).href
}
