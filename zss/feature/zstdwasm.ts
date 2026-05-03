import { init } from '@bokuweb/zstd-wasm'

let zstdinflight: Promise<void> | undefined
let zstdready = false

/** Single-flight WASM init for zstd (books save/load + peer wire). */
export async function ensurezstdwasm(): Promise<void> {
  if (zstdready) {
    return
  }
  if (!zstdinflight) {
    zstdinflight = (async () => {
      await init()
      zstdready = true
    })()
  }
  await zstdinflight
}
