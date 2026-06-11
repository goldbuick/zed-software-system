import { createmessage } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import type { GPU_PRIORITY } from 'zss/feature/gpu/gpupolicy'
import { createsid } from 'zss/mapping/guid'

const pendingacquires = new Map<string, () => void>()

let bridgeinstalled = false

function isworkercontext(): boolean {
  return (
    typeof WorkerGlobalScope !== 'undefined' &&
    self instanceof WorkerGlobalScope
  )
}

function installbridge() {
  if (!isworkercontext() || bridgeinstalled) {
    return
  }
  bridgeinstalled = true
  self.addEventListener('message', (event: MessageEvent) => {
    const message = event.data as MESSAGE
    if (!message?.target?.endsWith(':gpu:granted')) {
      return
    }
    const data = message.data as { lockid?: string }
    if (typeof data?.lockid !== 'string') {
      return
    }
    const resolve = pendingacquires.get(data.lockid)
    if (resolve) {
      pendingacquires.delete(data.lockid)
      resolve()
    }
  })
}

export function ensuregpuworkerbridge() {
  installbridge()
}

export function acquireworkergpulock(
  priority: GPU_PRIORITY,
  session: string,
): Promise<string> {
  ensuregpuworkerbridge()
  const lockid = createsid()
  return new Promise((resolve) => {
    pendingacquires.set(lockid, () => resolve(lockid))
    self.postMessage(
      createmessage(session, '', 'gpubridge', 'gpu:acquire', {
        lockid,
        priority,
      }),
    )
  })
}

export function releaseworkergpulock(lockid: string, session: string) {
  self.postMessage(
    createmessage(session, '', 'gpubridge', 'gpu:release', { lockid }),
  )
}

export async function withworkergpulock<T>(
  priority: GPU_PRIORITY,
  session: string,
  fn: () => Promise<T>,
): Promise<T> {
  const lockid = await acquireworkergpulock(priority, session)
  try {
    return await fn()
  } finally {
    releaseworkergpulock(lockid, session)
  }
}
