import type { WanixSystemElement } from './wanixelements.d.ts'
import {
  WANIX_ZEDCAFE_EXPORT_READY_POLL_MS,
  WANIX_ZEDCAFE_EXPORT_READY_TIMEOUT_MS,
  WANIX_ZEDCAFE_GUEST_MOUNT,
  WANIX_ZEDCAFE_TASK_ID,
  WANIX_ZEDCAFE_TASK_WASM,
  WANIX_ZEDCAFE_WASM_RAMFS,
  WANIX_ZEDCAFE_WASM_URL,
  readwanixzedcafeexportsrc,
} from './wanixzedcafeconstants'
import type { WanixZedCafeGuestFile } from './wanixzedcafetypes'

type WanixRoot = {
  readDir: (path: string) => Promise<string[]>
  readFile: (path: string) => Promise<Uint8Array | string>
  writeFile: (path: string, data: string | Uint8Array) => Promise<void>
}

type WanixTaskElement = HTMLElement & {
  rid?: string | null
  allocate?: () => Promise<void>
  start?: () => Promise<void>
}

let zedcafegen = 0
let zedcafecmd = ''
let zedcafetaskrid: string | null = null
let zedcafeready = false
let zedcafebootgen = 0
let zedcafebootpromise: Promise<string | null> | null = null

function setwanixattrs(el: HTMLElement, attrs: Record<string, unknown>) {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) {
      el.removeAttribute(key)
      continue
    }
    if (value === true || value === '') {
      el.setAttribute(key, '')
      continue
    }
    el.setAttribute(key, String(value as string | number))
  }
}

function createbind(attrs: Record<string, unknown>, marker?: string) {
  const bind = document.createElement('wanix-bind')
  setwanixattrs(bind, attrs)
  if (marker) {
    bind.setAttribute(marker, '')
  }
  return bind
}

export function resetzedcafestate() {
  zedcafegen = 0
  zedcafecmd = ''
  zedcafetaskrid = null
  zedcafeready = false
  zedcafebootgen = 0
  zedcafebootpromise = null
}

export function readzedcafetaskridlocal(): string | null {
  return zedcafetaskrid
}

export function readzedcafereadylocal(): boolean {
  return zedcafeready
}

export function synczedcafestate(cmd: string, generation: number) {
  zedcafecmd = cmd
  zedcafegen = generation
  zedcafeready = false
  zedcafetaskrid = null
  zedcafebootpromise = null
}

export function setzedcafereadylocal(ready: boolean) {
  zedcafeready = ready
}

function readzedcafeexportbindattrs(taskrid: string) {
  return {
    dst: WANIX_ZEDCAFE_GUEST_MOUNT,
    src: readwanixzedcafeexportsrc(taskrid),
  }
}

function appendzedcafewasmbind(task: WanixTaskElement) {
  if (task.querySelector('wanix-bind[data-zss-zedcafe-wasm]')) {
    return
  }
  const bind = createbind(
    {
      type: 'file',
      dst: WANIX_ZEDCAFE_TASK_WASM,
      src: WANIX_ZEDCAFE_WASM_URL,
    },
    'data-zss-zedcafe-wasm',
  )
  task.appendChild(bind)
}

function appendgojstask(
  sys: WanixSystemElement,
  cmd: string,
): WanixTaskElement {
  sys.querySelector(`wanix-task[id="${WANIX_ZEDCAFE_TASK_ID}"]`)?.remove()
  const task = document.createElement('wanix-task') as WanixTaskElement
  setwanixattrs(task, {
    id: WANIX_ZEDCAFE_TASK_ID,
    type: 'gojs',
    cmd,
  })
  task.setAttribute('data-zss-target-id', WANIX_ZEDCAFE_TASK_ID)
  sys.appendChild(task)
  return task
}

async function readzedcafeexportmountready(
  root: WanixRoot,
  taskrid: string,
): Promise<boolean> {
  const exportsrc = readwanixzedcafeexportsrc(taskrid)
  try {
    await root.readDir(exportsrc)
    return true
  } catch {
    // fall through
  }
  try {
    const entries = await root.readDir(`#task/${taskrid}`)
    return entries.some((entry) => entry.replace(/\/$/, '') === 'export')
  } catch {
    return false
  }
}

async function readzedcafeexportstatsready(
  root: WanixRoot,
  base: string,
): Promise<boolean> {
  try {
    await root.readFile(`${base}/stats.json`)
    return true
  } catch {
    return false
  }
}

export async function waitzedcafeexportmountready(
  root: WanixRoot,
  taskrid: string,
  timeoutms = WANIX_ZEDCAFE_EXPORT_READY_TIMEOUT_MS,
): Promise<boolean> {
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    if (await readzedcafeexportmountready(root, taskrid)) {
      return true
    }
    await new Promise<void>((resolve) =>
      setTimeout(resolve, WANIX_ZEDCAFE_EXPORT_READY_POLL_MS),
    )
  }
  return false
}

export async function waitzedcafeexportcontentready(
  root: WanixRoot,
  taskrid: string,
  timeoutms = WANIX_ZEDCAFE_EXPORT_READY_TIMEOUT_MS,
): Promise<boolean> {
  const exportsrc = readwanixzedcafeexportsrc(taskrid)
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    if (await readzedcafeexportstatsready(root, exportsrc)) {
      return true
    }
    await new Promise<void>((resolve) =>
      setTimeout(resolve, WANIX_ZEDCAFE_EXPORT_READY_POLL_MS),
    )
  }
  return false
}

export function appendzedcafeexportguestbind(
  sys: WanixSystemElement,
  taskrid: string,
) {
  sys
    .querySelectorAll('wanix-bind[data-zss-zedcafe-export="guest"]')
    .forEach((el) => el.remove())
  const bind = createbind(readzedcafeexportbindattrs(taskrid))
  bind.setAttribute('data-zss-zedcafe-export', 'guest')
  sys.appendChild(bind)
}

export function appendvmzedcafeexportguestbind(
  vm: HTMLElement,
  taskrid: string,
) {
  vm
    .querySelectorAll('wanix-bind[data-zss-zedcafe-export="vm-guest"]')
    .forEach((el) => el.remove())
  const bind = createbind(readzedcafeexportbindattrs(taskrid))
  bind.setAttribute('data-zss-zedcafe-export', 'vm-guest')
  vm.appendChild(bind)
}

export function refreshzedcafeexportbinds(
  sys: WanixSystemElement,
  taskrid: string,
): number {
  appendzedcafeexportguestbind(sys, taskrid)
  const vm = sys.querySelector('wanix-vm')
  if (vm) {
    appendvmzedcafeexportguestbind(vm, taskrid)
    return 2
  }
  return 1
}

async function collectexporttreefiles(
  root: WanixRoot,
  base: string,
): Promise<WanixZedCafeGuestFile[]> {
  const files: WanixZedCafeGuestFile[] = []

  function isleafpath(rel: string): boolean {
    const name = rel.split('/').pop() ?? rel
    return name.includes('.')
  }

  async function ingest(rel: string) {
    const path = rel ? `${base}/${rel}` : base
    if (rel && isleafpath(rel)) {
      try {
        const raw = await root.readFile(path)
        const bytes =
          raw instanceof Uint8Array
            ? raw
            : new TextEncoder().encode(String(raw))
        files.push({ path: rel, data: [...bytes] })
      } catch {
        // skip missing leaf
      }
      return
    }
    let entries: string[] | null = null
    try {
      entries = await root.readDir(path)
    } catch {
      entries = null
    }
    if (entries === null) {
      try {
        const raw = await root.readFile(path)
        const bytes =
          raw instanceof Uint8Array
            ? raw
            : new TextEncoder().encode(String(raw))
        files.push({ path: rel, data: [...bytes] })
      } catch {
        // skip missing path
      }
      return
    }
    for (const entry of entries) {
      const name = entry.replace(/\/$/, '')
      const childrel = rel ? `${rel}/${name}` : name
      await ingest(childrel)
    }
  }

  await ingest('')
  return files
}

export async function collectzedcafeexportfiles(
  root: WanixRoot,
  taskrid: string,
): Promise<WanixZedCafeGuestFile[]> {
  return collectexporttreefiles(root, readwanixzedcafeexportsrc(taskrid))
}

export async function pushzedcafeexportlive(
  root: WanixRoot,
  taskrid: string,
  files: WanixZedCafeGuestFile[],
) {
  const base = readwanixzedcafeexportsrc(taskrid)
  for (let i = 0; i < files.length; ++i) {
    const file = files[i]
    await root.writeFile(`${base}/${file.path}`, new Uint8Array(file.data))
  }
}

export function haltzedcafetask(sys: WanixSystemElement) {
  const task = sys.querySelector(
    `wanix-task[id="${WANIX_ZEDCAFE_TASK_ID}"]`,
  ) as WanixTaskElement | null
  if (task) {
    task.querySelectorAll('wanix-bind[data-zss-zedcafe-wasm]').forEach((el) =>
      el.remove(),
    )
    task.remove()
  }
  sys
    .querySelectorAll('wanix-bind[data-zss-zedcafe-export]')
    .forEach((el) => el.remove())
  sys.querySelector('wanix-vm')?.querySelectorAll(
    'wanix-bind[data-zss-zedcafe-export="vm-guest"]',
  ).forEach((el) => el.remove())
  zedcafetaskrid = null
  zedcafeready = false
}

async function scrubzedcafestaging(
  task: WanixTaskElement,
  sys: WanixSystemElement,
  root: WanixRoot,
) {
  task.querySelectorAll('wanix-bind[data-zss-zedcafe-wasm]').forEach((el) =>
    el.remove(),
  )

  try {
    await root.writeFile(WANIX_ZEDCAFE_WASM_RAMFS, new Uint8Array())
  } catch {
    // staging path may never have been written
  }
}

export async function bootzedcafegojs(
  sys: WanixSystemElement,
  root: WanixRoot,
  cmd: string,
): Promise<string | null> {
  const launchgen = zedcafegen

  const task = appendgojstask(sys, cmd)
  appendzedcafewasmbind(task)

  await task.allocate?.()
  if (launchgen !== zedcafegen) {
    return null
  }
  const taskrid = task.rid ?? null
  if (!taskrid) {
    throw new Error('zedcafe export: gojs allocate missing rid')
  }
  zedcafetaskrid = taskrid
  await task.start?.()
  if (launchgen !== zedcafegen) {
    return null
  }

  const mountready = await waitzedcafeexportmountready(root, taskrid, 5_000)
  if (!mountready) {
    await new Promise<void>((resolve) => setTimeout(resolve, 1_000))
  }

  await scrubzedcafestaging(task, sys, root)
  return taskrid
}

export async function finalizezedcafeexportcontent(
  sys: WanixSystemElement,
  _root: WanixRoot,
  taskrid: string,
  _vmmode: boolean,
): Promise<void> {
  refreshzedcafeexportbinds(sys, taskrid)
  zedcafeready = true
}

export async function ensurezedcafeboot(
  sys: WanixSystemElement,
  root: WanixRoot,
  cmd: string,
): Promise<string | null> {
  if (zedcafetaskrid && zedcafecmd === cmd) {
    const mountready = await waitzedcafeexportmountready(root, zedcafetaskrid)
    if (mountready) {
      return zedcafetaskrid
    }
  }
  if (zedcafebootpromise && zedcafebootgen === zedcafegen) {
    return zedcafebootpromise
  }
  zedcafebootgen = zedcafegen
  zedcafebootpromise = bootzedcafegojs(sys, root, cmd).finally(() => {
    if (zedcafebootgen === zedcafegen) {
      zedcafebootpromise = null
    }
  })
  return zedcafebootpromise
}

export async function waitzedcafemountrpc(
  sys: WanixSystemElement,
  root: WanixRoot,
  timeoutms: number,
): Promise<string | null> {
  if (!zedcafecmd) {
    return null
  }
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    if (zedcafetaskrid) {
      const mountready = await waitzedcafeexportmountready(
        root,
        zedcafetaskrid,
        Math.max(0, deadline - Date.now()),
      )
      if (mountready) {
        return zedcafetaskrid
      }
    }
    try {
      const taskrid = await ensurezedcafeboot(sys, root, zedcafecmd)
      if (taskrid) {
        return taskrid
      }
    } catch {
      // retry until deadline
    }
    await new Promise<void>((resolve) =>
      setTimeout(resolve, WANIX_ZEDCAFE_EXPORT_READY_POLL_MS),
    )
  }
  return zedcafetaskrid
}

export async function waitzedcafereadyrpc(
  sys: WanixSystemElement,
  root: WanixRoot,
  timeoutms: number,
): Promise<string | null> {
  if (!zedcafecmd) {
    return null
  }
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    if (zedcafetaskrid && zedcafeready) {
      return zedcafetaskrid
    }
    await new Promise<void>((resolve) =>
      setTimeout(resolve, WANIX_ZEDCAFE_EXPORT_READY_POLL_MS),
    )
  }
  return zedcafetaskrid && zedcafeready ? zedcafetaskrid : null
}
