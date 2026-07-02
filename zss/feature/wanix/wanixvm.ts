import { callwanixrpc, waitwanixready } from 'zss/feature/wanix/wanixbridge'

export const DEFAULT_WANIX_VM_ID = 'linux-vm'
export const DEFAULT_WANIX_VM_MEM = '512M'

const WANIX_VM_START_TIMEOUT_MS = 180_000

export type WanixVmStatus = {
  running: boolean
  vmid: string | null
  vrid: string | null
  mem: string | null
}

export type WanixVmStartResult = {
  ok: boolean
  already?: boolean
  vmid: string
  vrid?: string | null
  mem?: string | null
}

export async function startwanixvm(
  mem = DEFAULT_WANIX_VM_MEM,
  vmid = DEFAULT_WANIX_VM_ID,
): Promise<WanixVmStartResult> {
  await waitwanixready()
  return callwanixrpc<WanixVmStartResult>(
    'startvm',
    [mem, vmid],
    WANIX_VM_START_TIMEOUT_MS,
  )
}

export async function stopwanixvm(
  vmid = DEFAULT_WANIX_VM_ID,
): Promise<{ ok: boolean }> {
  await waitwanixready()
  return callwanixrpc<{ ok: boolean }>('stopvm', [vmid])
}

export async function readwanixvmstatus(): Promise<WanixVmStatus> {
  await waitwanixready()
  return callwanixrpc<WanixVmStatus>('readvmstatus')
}
