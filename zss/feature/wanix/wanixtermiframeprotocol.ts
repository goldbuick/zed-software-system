/** postMessage protocol — hidden iframe `<wanix-term>` host (parent ↔ child). */

export const WANIX_TERM_IFRAME_SRC = '/wanix-iframe-host.html'

export type WANIX_VM_PREP_STAGE =
  | 'idle'
  | 'mounting'
  | 'mount_ok'
  | 'spawn'
  | 'tile'
  | 'failed'

export type WANIX_TERM_IFRAME_RPC = {
  type: 'zss-wanix-term-rpc'
  id: number
  method: string
  args?: unknown[]
}

export type WANIX_TERM_IFRAME_MSG =
  | WANIX_TERM_IFRAME_RPC
  | {
      type: 'zss-wanix-term-rpc-res'
      id: number
      result?: unknown
      error?: string
    }
  | { type: 'zss-wanix-term-ready' }

export function iswanixtermiframemsg(
  data: unknown,
): data is WANIX_TERM_IFRAME_MSG {
  if (!data || typeof data !== 'object') {
    return false
  }
  const type = (data as { type?: unknown }).type
  return (
    type === 'zss-wanix-term-rpc' ||
    type === 'zss-wanix-term-rpc-res' ||
    type === 'zss-wanix-term-ready'
  )
}
