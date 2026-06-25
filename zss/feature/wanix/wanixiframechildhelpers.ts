import type {
  WanixRoot,
  WanixSystemElement,
  WanixTaskElement,
  WanixWakeElement,
} from 'zss/feature/wanix/wanixiframechildtypes'

export const WANIX_IFRAME_READY_TIMEOUT_MS = 180_000
export const WANIX_IFRAME_VM_PREP_WAIT_MS = 600_000
export const WANIX_IFRAME_ARCHIVE_MOUNT_TIMEOUT_MS = 120_000

export async function waitsystemready(
  system: WanixSystemElement,
  timeoutms = WANIX_IFRAME_READY_TIMEOUT_MS,
): Promise<WanixRoot> {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      stop()
      reject(new Error('wanix iframe child: ready timeout'))
    }, timeoutms)
    const onready = () => {
      stop()
      resolve()
    }
    const onerror = (event: Event) => {
      stop()
      const custom = event as CustomEvent<{ error?: unknown }>
      const detail = custom.detail?.error
      reject(
        new Error(
          detail instanceof Error
            ? detail.message
            : typeof detail === 'string'
              ? detail
              : 'wanix-system error',
        ),
      )
    }
    const stop = () => {
      clearTimeout(timer)
      system.removeEventListener('ready', onready)
      system.removeEventListener('error', onerror)
    }
    system.addEventListener('ready', onready, { once: true })
    system.addEventListener('error', onerror, { once: true })
  })
  const root = system.root ?? null
  if (!root) {
    throw new Error('wanix iframe child: root missing after ready')
  }
  return root
}

export async function waitvmchildready(
  system: WanixSystemElement,
  timeoutms: number,
): Promise<WanixWakeElement> {
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    const vm = system.querySelector('wanix-vm')
    if (vm?.rid && vm?.term) {
      return vm
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`wanix iframe child: vm ${system.id} not ready`)
}

export async function halttarget(
  root: WanixRoot | null,
  kind: 'vm' | 'task',
  id: string,
) {
  if (!root) {
    return
  }
  if (kind === 'vm') {
    const entries = await root.readDir('#vm').catch(() => [] as string[])
    for (const name of entries) {
      const rid = name.replace(/\/$/, '')
      if (!rid || rid === 'v86') {
        continue
      }
      try {
        const inner = await root.readDir(`#vm/${rid}`)
        const taskname = inner.find((n) => n.startsWith('task'))
        if (taskname) {
          const taskrid = taskname.replace(/\/$/, '').replace(/^task\/?/, '')
          if (taskrid) {
            await root.writeFile(`#task/${taskrid}/ctl`, 'stop')
          }
        }
      } catch {
        // vm may already be gone
      }
    }
    return
  }
  const task = document.getElementById(id) as WanixTaskElement | null
  if (task?.rid) {
    await root.writeFile(`#task/${task.rid}/ctl`, 'stop')
  }
}
