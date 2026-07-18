import type { WanixZedCafeGuestFile } from 'zss/feature/wanix/wanixzedcafetypes'

/** Below this size, cloning bytes through the device bus is not worth optimizing. */
export const WANIX_ZEDCAFE_TRANSFER_THRESHOLD_BYTES = 64 * 1024

export function readzedcafefilesbytesize(
  files: WanixZedCafeGuestFile[],
): number {
  let total = 0
  for (let i = 0; i < files.length; ++i) {
    total += files[i].data.byteLength
  }
  return total
}

export type WanixZedCafeTransferablePayload = {
  files: WanixZedCafeGuestFile[]
  transferable: ArrayBufferLike[]
}

/**
 * Collect the underlying ArrayBuffers for `files` as a `postMessage` transfer
 * list, when the payload is large enough that a zero-copy transfer is worth
 * the API surface (see WANIX_ZEDCAFE_TRANSFER_THRESHOLD_BYTES).
 *
 * NOTE: `zss/hub.ts` tunnels `device.emit` (parent<->wanix iframe, including
 * the zedcafe export sync path) through `BroadcastChannel`, whose
 * `postMessage(message)` has no transfer-list parameter and always
 * structured-clones (copies) `ArrayBuffer`/`Uint8Array` payloads. This helper
 * is only useful on a real `Window`/`Worker` `postMessage(message, target,
 * transfer)` call — wire it in at that call site, not at `device.emit`.
 */
export function exportfilestotransferable(
  files: WanixZedCafeGuestFile[],
): WanixZedCafeTransferablePayload | null {
  if (
    readzedcafefilesbytesize(files) <= WANIX_ZEDCAFE_TRANSFER_THRESHOLD_BYTES
  ) {
    return null
  }
  const transferable: ArrayBufferLike[] = []
  for (let i = 0; i < files.length; ++i) {
    const buffer = files[i].data.buffer
    if (!transferable.includes(buffer)) {
      transferable.push(buffer)
    }
  }
  return { files, transferable }
}
