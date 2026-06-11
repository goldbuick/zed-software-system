import { createmessage } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import {
  getgpuresidencymode,
  initgpumodelbudget,
} from 'zss/feature/gpu/gpumodelbudget'
import { createsid } from 'zss/mapping/guid'

const pendingsttdispose = new Map<string, () => void>()

let repliesinstalled = false

export function installheavygpudisposereplies() {
  if (repliesinstalled) {
    return
  }
  repliesinstalled = true
  self.addEventListener('message', (event: MessageEvent) => {
    const message = event.data as MESSAGE
    if (message?.target !== 'heavy:sttdisposed') {
      return
    }
    const requestid = (message.data as { requestid?: string })?.requestid
    if (!requestid) {
      return
    }
    const resolve = pendingsttdispose.get(requestid)
    if (resolve) {
      pendingsttdispose.delete(requestid)
      resolve()
    }
  })
}

export async function prepareforheavyload(): Promise<void> {
  await initgpumodelbudget()
  if (getgpuresidencymode() !== 'exclusive') {
    return
  }
  const session = SOFTWARE.session()
  if (!session) {
    return
  }
  installheavygpudisposereplies()
  const requestid = createsid()
  await new Promise<void>((resolve) => {
    pendingsttdispose.set(requestid, resolve)
    self.postMessage(
      createmessage(session, '', 'heavy', 'gpu:sttdispose', { requestid }),
    )
    setTimeout(() => {
      if (pendingsttdispose.has(requestid)) {
        pendingsttdispose.delete(requestid)
        resolve()
      }
    }, 30_000)
  })
}
