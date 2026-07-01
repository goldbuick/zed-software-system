import { createmessage, parsetarget } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { acquiregpulock, releasegpulock } from 'zss/feature/gpu/gpulock'
import {
  canresidentboth,
  initgpumodelbudget,
} from 'zss/feature/gpu/gpumodelbudget'
import { createsid } from 'zss/mapping/guid'

type PlatformWorkers = {
  stt?: Worker
}

let workers: PlatformWorkers = {}

export function setplatformgpuworkers(next: PlatformWorkers) {
  workers = next
}

export async function bootgpucoordinator() {
  const mode = await initgpumodelbudget()
  if (import.meta.env.DEV) {
    console.info('[gpu] residency mode:', mode, 'dual ok:', canresidentboth())
  }
}

export function handleplatformgpurequest(
  message: MESSAGE,
  source: Worker,
): boolean {
  const { target, path } = parsetarget(message.target)
  if (target !== 'gpu') {
    return false
  }

  const data = message.data as { lockid?: string }
  const session = message.session || SOFTWARE.session()

  if (path === 'acquire') {
    const lockid = typeof data?.lockid === 'string' ? data.lockid : createsid()
    void acquiregpulock(lockid, 'stt').then(() => {
      source.postMessage(
        createmessage(
          session,
          '',
          'platform',
          `${message.sender}:gpu:granted`,
          {
            lockid,
          },
        ),
      )
    })
    return true
  }

  if (path === 'release' && typeof data?.lockid === 'string') {
    releasegpulock(data.lockid)
    return true
  }

  if (path === 'sttdispose') {
    const requestid = (message.data as { requestid?: string })?.requestid
    void requeststtdispose().then(() => {
      source.postMessage(
        createmessage(session, '', 'platform', 'stt:disposed', {
          requestid,
        }),
      )
    })
    return true
  }

  return false
}

export async function prepareforsttload(): Promise<void> {
  await initgpumodelbudget()
}

export function requeststtdispose(): Promise<void> {
  const bound = workers.stt
  if (!bound) {
    return Promise.resolve()
  }
  const session = SOFTWARE.session()
  if (!session) {
    return Promise.resolve()
  }
  const requestid = createsid()
  const sttworker: Worker = bound
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      sttworker.removeEventListener('message', onreply)
      resolve()
    }, 30_000)

    function onreply(event: MessageEvent) {
      const reply = event.data as MESSAGE
      if (
        reply?.target === `platform:stt:disposed` &&
        (reply.data as { requestid?: string })?.requestid === requestid
      ) {
        clearTimeout(timeout)
        sttworker.removeEventListener('message', onreply)
        resolve()
      }
    }

    sttworker.addEventListener('message', onreply)
    sttworker.postMessage(
      createmessage(session, '', 'platform', 'stt:dispose', { requestid }),
    )
  })
}
