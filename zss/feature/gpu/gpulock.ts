import type { GPU_PRIORITY } from 'zss/feature/gpu/gpupolicy'

type LockWaiter = {
  lockid: string
  priority: GPU_PRIORITY
  resolve: () => void
}

let currentlockid: string | undefined
const waitqueue: LockWaiter[] = []

function sortwaitqueue() {
  waitqueue.sort(() => 0)
}

function grantnext() {
  if (currentlockid || waitqueue.length === 0) {
    return
  }
  sortwaitqueue()
  const next = waitqueue.shift()
  if (!next) {
    return
  }
  currentlockid = next.lockid
  next.resolve()
}

export function acquiregpulock(
  lockid: string,
  priority: GPU_PRIORITY,
): Promise<void> {
  if (!currentlockid) {
    currentlockid = lockid
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    waitqueue.push({ lockid, priority, resolve })
    sortwaitqueue()
  })
}

export function releasegpulock(lockid: string) {
  if (currentlockid !== lockid) {
    return
  }
  currentlockid = undefined
  grantnext()
}

export async function withmainthreadgpulock<T>(
  priority: GPU_PRIORITY,
  lockid: string,
  fn: () => Promise<T>,
): Promise<T> {
  await acquiregpulock(lockid, priority)
  try {
    return await fn()
  } finally {
    releasegpulock(lockid)
  }
}
