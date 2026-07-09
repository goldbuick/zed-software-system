import type { WanixSystemElement } from './wanixelements.d.ts'
import {
  WANIX_ZEDCAFE_EXPORT_RAMFS,
  WANIX_ZEDCAFE_EXPORT_READY_POLL_MS,
  WANIX_ZEDCAFE_EXPORT_READY_TIMEOUT_MS,
  WANIX_ZEDCAFE_GUEST_MOUNT,
  WANIX_ZEDCAFE_TASK_ID,
  WANIX_ZEDCAFE_TASK_WASM,
  WANIX_ZEDCAFE_WASM_RAMFS,
  WANIX_ZEDCAFE_WASM_URL,
  readwanixzedcafeexportsrc,
  readwanixzedcafeguestpath,
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

function revokebindbloburls(
  root: ParentNode,
  selector: string,
  urlattr: string,
) {
  root.querySelectorAll(selector).forEach((el) => {
    const url = el.getAttribute(urlattr)
    if (url?.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
    el.remove()
  })
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
  base: string,
): Promise<boolean> {
  try {
    await root.readDir(base)
    return true
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
  const exportsrc = readwanixzedcafeexportsrc(taskrid)
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    if (await readzedcafeexportmountready(root, exportsrc)) {
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

function appendzedcafeexportguestbind(
  sys: WanixSystemElement,
  taskrid: string,
) {
  const exportsrc = readwanixzedcafeexportsrc(taskrid)
  sys
    .querySelectorAll('wanix-bind[data-zss-zedcafe-export="guest"]')
    .forEach((el) => el.remove())
  const bind = createbind({
    dst: WANIX_ZEDCAFE_GUEST_MOUNT,
    src: exportsrc,
  })
  bind.setAttribute('data-zss-zedcafe-export', 'guest')
  sys.appendChild(bind)
}

function appendzedcafeexportramfsbind(
  sys: WanixSystemElement,
  taskrid: string,
) {
  const exportsrc = readwanixzedcafeexportsrc(taskrid)
  sys
    .querySelectorAll('wanix-bind[data-zss-zedcafe-export="ramfs"]')
    .forEach((el) => el.remove())
  const bind = createbind({
    dst: WANIX_ZEDCAFE_EXPORT_RAMFS,
    src: exportsrc,
  })
  bind.setAttribute('data-zss-zedcafe-export', 'ramfs')
  bind.setAttribute('src', exportsrc)
  sys.appendChild(bind)
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

export async function collectzedcafeexportramfsfiles(
  root: WanixRoot,
): Promise<WanixZedCafeGuestFile[]> {
  return collectexporttreefiles(root, WANIX_ZEDCAFE_EXPORT_RAMFS)
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
  revokebindbloburls(
    sys,
    'wanix-bind[data-zss-zedcafe-guest]',
    'data-zss-guest-blob-url',
  )
  zedcafetaskrid = null
  zedcafeready = false
}

function appendzedcafeexportramfsfilebinds(
  sys: WanixSystemElement,
  guestfiles: WanixZedCafeGuestFile[],
) {
  revokebindbloburls(
    sys,
    'wanix-bind[data-zss-zedcafe-guest]',
    'data-zss-guest-blob-url',
  )
  for (let i = 0; i < guestfiles.length; ++i) {
    const file = guestfiles[i]
    const bloburl = URL.createObjectURL(new Blob([new Uint8Array(file.data)]))
    const bind = createbind({
      type: 'file',
      dst: `${WANIX_ZEDCAFE_EXPORT_RAMFS}/${file.path}`,
      src: bloburl,
    })
    bind.setAttribute('data-zss-zedcafe-guest', '')
    bind.setAttribute('data-zss-guest-blob-url', bloburl)
    sys.appendChild(bind)
  }
}

function appendvmzedcafestagingbind(vm: HTMLElement) {
  if (vm.querySelector('wanix-bind[data-zss-zedcafe-export="vm-staging"]')) {
    return
  }
  const bind = createbind({
    dst: WANIX_ZEDCAFE_GUEST_MOUNT,
    src: WANIX_ZEDCAFE_EXPORT_RAMFS,
  })
  bind.setAttribute('data-zss-zedcafe-export', 'vm-staging')
  vm.appendChild(bind)
}

function appendvmzedcafeguestfilebinds(
  vm: HTMLElement,
  guestfiles: WanixZedCafeGuestFile[],
) {
  vm
    .querySelectorAll('wanix-bind[data-zss-zedcafe-export="vm-staging"]')
    .forEach((el) => el.remove())
  revokebindbloburls(
    vm,
    'wanix-bind[data-zss-zedcafe-vm-guest-file]',
    'data-zss-vm-guest-blob-url',
  )

  for (let i = 0; i < guestfiles.length; ++i) {
    const file = guestfiles[i]
    const bloburl = URL.createObjectURL(new Blob([new Uint8Array(file.data)]))
    const bind = createbind(
      {
        type: 'file',
        dst: readwanixzedcafeguestpath(file.path),
        src: bloburl,
      },
      'data-zss-zedcafe-vm-guest-file',
    )
    bind.setAttribute('data-zss-vm-guest-blob-url', bloburl)
    vm.appendChild(bind)
  }
}

function isvmstarted(vm: HTMLElement): boolean {
  return vm.hasAttribute('start')
}

export function refreshvmzedcafeguestfiles(
  sys: WanixSystemElement,
  guestfiles: WanixZedCafeGuestFile[],
): number {
  if (!guestfiles.some((file) => file.path === 'stats.json')) {
    return 0
  }
  appendzedcafeexportramfsfilebinds(sys, guestfiles)
  const vm = sys.querySelector('wanix-vm')
  if (!vm) {
    return guestfiles.length
  }
  if (isvmstarted(vm)) {
    appendvmzedcafeguestfilebinds(vm, guestfiles)
  } else {
    appendvmzedcafestagingbind(vm)
  }
  return guestfiles.length
}

async function scrubzedcafestaging(
  task: WanixTaskElement,
  sys: WanixSystemElement,
  root: WanixRoot,
) {
  task.querySelectorAll('wanix-bind[data-zss-zedcafe-wasm]').forEach((el) =>
    el.remove(),
  )
  revokebindbloburls(
    sys,
    'wanix-bind[data-zss-zedcafe-wasm]',
    'data-zss-guest-blob-url',
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

  const mountready = await waitzedcafeexportmountready(root, taskrid)
  if (!mountready) {
    throw new Error('zedcafe export: export mount missing')
  }

  await scrubzedcafestaging(task, sys, root)
  return taskrid
}

export async function finalizezedcafeexportcontent(
  sys: WanixSystemElement,
  root: WanixRoot,
  taskrid: string,
  vmmode: boolean,
): Promise<void> {
  if (vmmode) {
    appendzedcafeexportramfsbind(sys, taskrid)
    const guestfiles = await collectzedcafeexportfiles(root, taskrid)
    refreshvmzedcafeguestfiles(sys, guestfiles)
  } else {
    appendzedcafeexportguestbind(sys, taskrid)
  }
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
