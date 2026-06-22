/** Shared VM spawn wait helpers (in-page host + iframe child). */

export const VM_SPAWN_STEP_MS = 120_000
export const VM_TERM_READY_MS = 90_000

type WanixWakeElement = HTMLElement & {
  rid?: string | null
  term?: string
  _awake?: () => Promise<void>
  start?: () => Promise<void>
}

type WanixRoot = {
  readDir: (path: string) => Promise<string[]>
}

export async function waitforgadgetidle() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

export async function spawnwithtimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`wanix vm run: ${label} timeout (${ms}ms)`)),
        ms,
      )
    }),
  ])
}

export async function waitforv86driver(
  root: WanixRoot,
  timeoutms: number,
): Promise<void> {
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    try {
      const entries = await root.readDir('#vm/v86')
      if (entries.some((name) => name.replace(/\/$/, '') === 'v86-vm.wasm')) {
        return
      }
    } catch {
      // #vm/v86 not mounted yet
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(
    'wanix vm prep: v86 driver not found after mount — check CDN/network',
  )
}

export async function waitforwanixvmready(
  sys: ParentNode,
  root: WanixRoot,
  vmid: string,
  timeoutms: number,
): Promise<WanixWakeElement> {
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    const vm = sys.querySelector(`wanix-vm#${vmid}`)
    if (vm?.rid && vm?.term) {
      return vm
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 250))
  }
  let termdir: string[] = []
  try {
    termdir = await root.readDir('#term')
  } catch {
    termdir = []
  }
  const partial = sys.querySelector(`wanix-vm#${vmid}`)
  throw new Error(
    `wanix vm prep: ${vmid} not ready (rid=${partial?.rid ?? 'none'} term=${partial?.term ?? 'none'} #term=${termdir.join(',')})`,
  )
}
