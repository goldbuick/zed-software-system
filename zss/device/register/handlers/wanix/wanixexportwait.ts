import type { WanixExportEventKind } from 'zss/device/wanix/exportevents'
import { WANIX_MSG_EXPORT } from 'zss/feature/wanix/wanixrpcmessages'

type ExportWaiter = {
  resolve: () => void
  reject: (err: Error) => void
  timer: ReturnType<typeof setTimeout>
}

const contentwaiters = new Map<string, Set<ExportWaiter>>()

export function notifywanixexportready(
  taskrid: string,
  event: WanixExportEventKind,
) {
  if (event !== 'content-ready') {
    return
  }
  const waiters = contentwaiters.get(taskrid)
  if (!waiters?.size) {
    return
  }
  contentwaiters.delete(taskrid)
  for (const waiter of waiters) {
    clearTimeout(waiter.timer)
    waiter.resolve()
  }
}

export function waitwanixexportcontentready(
  taskrid: string,
  timeoutms: number,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      const waiters = contentwaiters.get(taskrid)
      if (waiters) {
        waiters.delete(waiter)
        if (waiters.size === 0) {
          contentwaiters.delete(taskrid)
        }
      }
      reject(
        new Error(`zedcafe export content-ready timeout taskrid=${taskrid}`),
      )
    }, timeoutms)
    const waiter: ExportWaiter = {
      resolve: () => resolve(),
      reject,
      timer,
    }
    let waiters = contentwaiters.get(taskrid)
    if (!waiters) {
      waiters = new Set()
      contentwaiters.set(taskrid, waiters)
    }
    waiters.add(waiter)
  })
}

export function handlewanixexportmessage(data: Record<string, unknown>) {
  if (data.type !== WANIX_MSG_EXPORT) {
    return false
  }
  const taskrid = data.taskrid
  const event = data.event
  if (typeof taskrid !== 'string' || typeof event !== 'string') {
    return true
  }
  notifywanixexportready(taskrid, event as WanixExportEventKind)
  return true
}

/** Test hook */
export function resetwanixexportwaitfortest() {
  for (const waiters of contentwaiters.values()) {
    for (const waiter of waiters) {
      clearTimeout(waiter.timer)
    }
  }
  contentwaiters.clear()
}
