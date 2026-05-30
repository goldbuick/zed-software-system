import { DAISY_BUILD_ID } from './daisybuildid'

export const DAISY_WASM_BASE = '/wasm/daisy'

export function daisyasseturl(filename: string): string {
  const base = DAISY_WASM_BASE.replace(/\/$/, '')
  const url = new URL(`${base}/${filename}`, window.location.href)
  const commit = import.meta.env.ZSS_COMMIT_HASH?.slice(0, 8) ?? 'dev'
  url.searchParams.set('v', `${commit}-${DAISY_BUILD_ID}`)
  return url.href
}
