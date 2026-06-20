import type { DEVICELIKE } from 'zss/device/api'
import {
  haltwanixvm,
  listwanixdir,
  readwanixhostattachedserial,
  readwanixstatus,
  sendwanixterminput,
  spawnwanixvm,
  spawnwanixvmspace,
} from 'zss/feature/wanix/wanixhost'
import {
  runwanixvmtermstress,
  type WANIX_VM_TERM_STRESS_REPORT,
} from 'zss/testsupport/e2e/wanixrepro'

const E2E_DEVICE = {
  emit: () => true,
} as DEVICELIKE

const E2E_PLAYER = 'wanix-vm-e2e'

export type WanixE2eBridge = {
  prepwanixhostvm: (urls: { linux: string; v86: string }) => Promise<void>
  spawnwanixhostvm: (opts?: {
    vmid?: string
    mem?: string
    attach?: boolean
    wait?: boolean
  }) => Promise<{ vmid: string; code?: number }>
  readwanixhostserial: () => string
  listwanixhostdir: (path: string) => Promise<string[]>
  haltwanixhostvm: (vmid?: string) => Promise<void>
  sendwanixhostterminput: (text: string) => Promise<void>
  runwanixvmtermstress: (urls: {
    linux: string
    v86: string
  }) => Promise<WANIX_VM_TERM_STRESS_REPORT>
  getwanixdiag: () => Promise<Awaited<ReturnType<typeof readwanixstatus>>>
}

export function installewanixe2ebridge(): void {
  if (typeof window === 'undefined') {
    return
  }
  const w0 = window as Window & { __zss_e2e?: WanixE2eBridge }
  if (w0.__zss_e2e) {
    return
  }
  w0.__zss_e2e = {
    async prepwanixhostvm(urls) {
      await spawnwanixvmspace(E2E_DEVICE, E2E_PLAYER, urls)
    },
    async spawnwanixhostvm(opts) {
      return spawnwanixvm(opts)
    },
    readwanixhostserial() {
      return readwanixhostattachedserial()
    },
    async listwanixhostdir(path) {
      return listwanixdir(path)
    },
    async haltwanixhostvm(vmid) {
      await haltwanixvm(vmid)
    },
    async sendwanixhostterminput(text) {
      await sendwanixterminput(text)
    },
    runwanixvmtermstress(urls) {
      return runwanixvmtermstress(urls)
    },
    getwanixdiag() {
      return readwanixstatus()
    },
  }
}
