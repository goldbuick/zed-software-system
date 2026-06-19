/** Parent ↔ hidden iframe VM host (postMessage). */

export const WANIX_VM_IFRAME_SRC = '/wanix-vm-e2e.html?embed=1'

export type WANIX_VM_IFRAME_RPC = {
  type: 'zss-wanix-vm-rpc'
  id: number
  method: string
  args: unknown[]
}

export type WANIX_VM_IFRAME_RPC_RES = {
  type: 'zss-wanix-vm-rpc-res'
  id: number
  result?: unknown
  error?: string
}

export type WANIX_VM_IFRAME_TERM = {
  type: 'zss-wanix-vm-term'
  vmid: string
  chunk: string
}

export type WANIX_VM_IFRAME_EXIT = {
  type: 'zss-wanix-vm-exit'
  vmid: string
  code: number
}

export type WANIX_VM_IFRAME_READY = {
  type: 'zss-wanix-vm-ready'
}

export type WANIX_VM_IFRAME_MSG =
  | WANIX_VM_IFRAME_RPC
  | WANIX_VM_IFRAME_RPC_RES
  | WANIX_VM_IFRAME_TERM
  | WANIX_VM_IFRAME_EXIT
  | WANIX_VM_IFRAME_READY

export function iswanixvmiframemsg(data: unknown): data is WANIX_VM_IFRAME_MSG {
  if (typeof data !== 'object' || data == null || !('type' in data)) {
    return false
  }
  const t = (data as { type: string }).type
  return (
    t === 'zss-wanix-vm-rpc' ||
    t === 'zss-wanix-vm-rpc-res' ||
    t === 'zss-wanix-vm-term' ||
    t === 'zss-wanix-vm-exit' ||
    t === 'zss-wanix-vm-ready'
  )
}
