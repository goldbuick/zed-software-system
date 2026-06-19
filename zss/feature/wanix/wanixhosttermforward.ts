type VmTermForwarder = (vmid: string, chunk: string) => void

let vmtermforwarder: VmTermForwarder | undefined

export function setwanixvmtermforwarder(fn: VmTermForwarder | undefined) {
  vmtermforwarder = fn
}

export function forwardwanixvmtermchunk(vmid: string, chunk: string) {
  vmtermforwarder?.(vmid, chunk)
}
