import type { WanixRoot } from 'zss/feature/wanix/wanixiframechildtypes'

export const VM_TERM_READY_MS = 90_000
/** Linux guest shell after wanix-vm start (Playwright gate allows 240s). */
export const WANIX_VM_GUEST_SHELL_MS = 300_000

export async function waitforv86driver(
  root: WanixRoot,
  timeoutms: number,
): Promise<void> {
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    try {
      const entries = await root.readDir('#vm/v86')
      if (entries.some((name) => name.replace(/\/$/, '') === 'v86-vm.wasm')) {
        return
      }
    } catch {
      // #vm/v86 not mounted yet
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(
    'wanix vm prep: v86 driver not found after mount — check CDN/network',
  )
}
