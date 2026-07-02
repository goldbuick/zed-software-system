import { waitwanixready } from 'zss/feature/wanix/wanixbridge'
import {
  readwanixroomconfig,
  readwanixroomstatus,
  startwanixvmroom,
  stopwanixvmroom,
} from 'zss/feature/wanix/wanixroom'

export const DEFAULT_WANIX_VM_ID = 'linux-vm'
export const DEFAULT_WANIX_VM_MEM = '512M'

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
  const result = (await startwanixvmroom(vmid, mem)) as WanixVmStatus & {
    vrid?: string | null
    already?: boolean
  }
  if (result.running) {
    return {
      ok: true,
      already: true,
      vmid: result.vmid ?? vmid,
      vrid: result.vrid ?? null,
      mem: result.mem ?? mem,
    }
  }
  return {
    ok: true,
    vmid: result.vmid ?? vmid,
    vrid: result.vrid ?? null,
    mem: result.mem ?? mem,
  }
}

export async function stopwanixvm(
  vmid = DEFAULT_WANIX_VM_ID,
): Promise<{ ok: boolean }> {
  await waitwanixready()
  const config = readwanixroomconfig()
  if (config.mode !== 'vm') {
    return { ok: true }
  }
  if (config.vm?.id && config.vm.id !== vmid) {
    return { ok: true }
  }
  await stopwanixvmroom()
  return { ok: true }
}

export async function readwanixvmstatus(): Promise<WanixVmStatus> {
  await waitwanixready()
  const status = await readwanixroomstatus()
  const vm = status.vm
  return {
    running: status.vmrunning ?? false,
    vmid: vm?.id ?? null,
    vrid: null,
    mem: vm?.mem ?? null,
  }
}
