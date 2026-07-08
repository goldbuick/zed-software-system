import type { WanixSystemElement } from 'zss/feature/wanix/wanixelements.d.ts'
import {
  WANIX_ZEDCAFE_EXPORT_RAMFS,
  WANIX_ZEDCAFE_EXPORT_READY_POLL_MS,
  WANIX_ZEDCAFE_EXPORT_READY_TIMEOUT_MS,
  WANIX_ZEDCAFE_GUEST_MOUNT,
  WANIX_ZEDCAFE_INBOX_RAMFS,
  WANIX_ZEDCAFE_TASK_ID,
  WANIX_ZEDCAFE_WASM_RAMFS,
  WANIX_ZEDCAFE_WASM_URL,
  readwanixzedcafeexportsrc,
} from 'zss/feature/wanix/wanixzedcafeconstants'
import type { WanixZedCafeGuestFile } from 'zss/feature/wanix/wanixzedcafetypes'

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

function appendzedcafewasmbind(sys: WanixSystemElement) {
  if (sys.querySelector('wanix-bind[data-zss-zedcafe-wasm]')) {
    return
  }
  const bind = createbind(
    {
      type: 'file',
      dst: WANIX_ZEDCAFE_WASM_RAMFS,
      src: WANIX_ZEDCAFE_WASM_URL,
    },
    'data-zss-zedcafe-wasm',
  )
  sys.appendChild(bind)
}

function appendzedcafeinboxbind(sys: WanixSystemElement, inboxbytes: number[]) {
  sys
    .querySelectorAll('wanix-bind[data-zss-zedcafe-inbox-file]')
    .forEach((el) => el.remove())
  if (!inboxbytes.length) {
    return
  }
  const bloburl = URL.createObjectURL(new Blob([new Uint8Array(inboxbytes)]))
  const bind = createbind(
    {
      type: 'file',
      dst: WANIX_ZEDCAFE_INBOX_RAMFS,
      src: bloburl,
    },
    'data-zss-zedcafe-inbox-file',
  )
  bind.setAttribute('data-zss-inbox-blob-url', bloburl)
  sys.appendChild(bind)
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

async function readzedcafeexportstatsready(
  root: WanixRoot,
  base: string,
): Promise<boolean> {
  try {
    await root.readFile(`${base}/stats.json`)
    return true
  } catch {
    try {
      const entries = await root.readDir(base)
      return entries.some((entry) => entry.replace(/\/$/, '') === 'stats.json')
    } catch {
      return false
    }
  }
}

export async function waitzedcafeexportready(
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
  sys.querySelector(`wanix-task[id="${WANIX_ZEDCAFE_TASK_ID}"]`)?.remove()
  sys
    .querySelectorAll(
      'wanix-bind[data-zss-zedcafe-export], wanix-bind[data-zss-zedcafe-inbox-file]',
    )
    .forEach((el) => el.remove())
  zedcafetaskrid = null
  zedcafeready = false
}

function appendzedcafeexportramfsfilebinds(
  sys: WanixSystemElement,
  guestfiles: WanixZedCafeGuestFile[],
) {
  sys
    .querySelectorAll('wanix-bind[data-zss-zedcafe-guest]')
    .forEach((el) => el.remove())
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

export function refreshvmzedcafeguestfiles(
  sys: WanixSystemElement,
  guestfiles: WanixZedCafeGuestFile[],
): number {
  if (!guestfiles.length) {
    return 0
  }
  appendzedcafeexportramfsfilebinds(sys, guestfiles)
  const vm = sys.querySelector('wanix-vm')
  if (vm) {
    appendvmzedcafestagingbind(vm)
  }
  return guestfiles.length
}

export async function bootzedcafegojs(
  sys: WanixSystemElement,
  root: WanixRoot,
  cmd: string,
  inboxbytes: number[],
  vmmode: boolean,
): Promise<string | null> {
  const launchgen = zedcafegen
  appendzedcafewasmbind(sys)
  appendzedcafeinboxbind(sys, inboxbytes)

  if (inboxbytes.length) {
    await root.writeFile(WANIX_ZEDCAFE_INBOX_RAMFS, new Uint8Array(inboxbytes))
  }

  const task = appendgojstask(sys, cmd)
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

  const exportready = await waitzedcafeexportready(root, taskrid)
  if (!exportready) {
    throw new Error('zedcafe export: stats.json missing from export tree')
  }

  if (vmmode) {
    appendzedcafeexportramfsbind(sys, taskrid)
    const guestfiles = await collectzedcafeexportfiles(root, taskrid)
    refreshvmzedcafeguestfiles(sys, guestfiles)
  } else {
    appendzedcafeexportguestbind(sys, taskrid)
  }

  zedcafeready = true
  return taskrid
}

export async function ensurezedcafeboot(
  sys: WanixSystemElement,
  root: WanixRoot,
  cmd: string,
  inboxbytes: number[],
  vmmode: boolean,
): Promise<string | null> {
  if (zedcafeready && zedcafetaskrid && zedcafecmd === cmd) {
    return zedcafetaskrid
  }
  if (zedcafebootpromise && zedcafebootgen === zedcafegen) {
    return zedcafebootpromise
  }
  zedcafebootgen = zedcafegen
  zedcafebootpromise = bootzedcafegojs(
    sys,
    root,
    cmd,
    inboxbytes,
    vmmode,
  ).finally(() => {
    if (zedcafebootgen === zedcafegen) {
      zedcafebootpromise = null
    }
  })
  return zedcafebootpromise
}

export async function waitzedcafereadyrpc(
  sys: WanixSystemElement,
  root: WanixRoot,
  timeoutms: number,
  vmmode: boolean,
): Promise<string | null> {
  if (!zedcafecmd) {
    return null
  }
  const inboxbind = sys.querySelector('wanix-bind[data-zss-zedcafe-inbox-file]')
  let inboxbytes: number[] = []
  if (inboxbind) {
    try {
      const raw = await root.readFile(WANIX_ZEDCAFE_INBOX_RAMFS)
      const bytes =
        raw instanceof Uint8Array ? raw : new TextEncoder().encode(String(raw))
      inboxbytes = [...bytes]
    } catch {
      inboxbytes = []
    }
  }
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    if (zedcafetaskrid && zedcafeready) {
      return zedcafetaskrid
    }
    try {
      const taskrid = await ensurezedcafeboot(
        sys,
        root,
        zedcafecmd,
        inboxbytes,
        vmmode,
      )
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
