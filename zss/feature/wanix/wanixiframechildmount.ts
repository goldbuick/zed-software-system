import type { WanixIframeChildController } from 'zss/feature/wanix/wanixiframechildcontroller'
import {
  WANIX_IFRAME_SYSTEM_ID,
  type WanixIframeArchive,
  type WanixIframeRemote,
  type WanixIframeHostState,
  iswanixroomready,
  type WanixRoot,
  type WanixSystemElement,
} from 'zss/feature/wanix/wanixiframechildtypes'
import { createwanixroomtree } from 'zss/feature/wanix/wanixroombootstrap'
import { applywanixtermprobelayout } from 'zss/feature/wanix/wanixtermprobe'
import { postwanixiframeapilog } from 'zss/feature/wanix/wanixtermiframeprotocol'
import {
  type WANIX_VM_ASSET_URLS,
  readwanixkernelwasmurl,
} from 'zss/feature/wanix/wanixvmassets'
import {
  WANIX_ZED_CAFE_EXPORT_RAMFS,
  WANIX_ZED_CAFE_INBOX_RAMFS,
  WANIX_ZED_CAFE_WASM_RAMFS,
  WANIX_ZED_CAFE_WASM_URL,
  readwanixzedcafeexportsrc,
} from 'zss/feature/wanix/wanixzedcafeconstants'
import type { WanixZedCafeExportProbe } from 'zss/feature/wanix/wanixzedcafeprobe'
import type { WanixZedCafeGuestFile } from 'zss/feature/wanix/wanixiframechildtypes'

type WanixAttrValue = string | boolean | undefined

export const WANIX_BIND_MOUNT_TIMEOUT_MS = 10_000
export const WANIX_ROOT_WAIT_TIMEOUT_MS = 5_000
export const WANIX_ZED_CAFE_EXPORT_READY_POLL_MS = 250
export const WANIX_ZED_CAFE_EXPORT_READY_TIMEOUT_MS = 30_000

export function setwanixattrs(
  el: HTMLElement,
  attrs: Record<string, WanixAttrValue>,
) {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) {
      el.removeAttribute(key)
      continue
    }
    if (value === true || value === '') {
      el.setAttribute(key, '')
      continue
    }
    el.setAttribute(key, value)
  }
}

function createwanixsystem(): WanixSystemElement {
  const sys = document.createElement('wanix-system') as WanixSystemElement
  setwanixattrs(sys, {
    wasm: readwanixkernelwasmurl(),
    'allow-origins': '*',
    debug: true,
    id: WANIX_IFRAME_SYSTEM_ID,
  })
  return sys
}

function createwanixbind(attrs: Record<string, WanixAttrValue>) {
  const bind = document.createElement('wanix-bind')
  setwanixattrs(bind, attrs)
  return bind
}

function createwanixterm(
  path: string,
  opts?: { raw?: boolean; vmid?: string },
) {
  const term = document.createElement('wanix-term')
  setwanixattrs(term, {
    path,
    ...(opts?.raw ? { raw: true } : {}),
    ...(opts?.vmid ? { 'data-zss-vm-term': opts.vmid } : {}),
  })
  applywanixtermprobelayout(term)
  return term
}

function appendtaskbinds(sys: WanixSystemElement) {
  sys.appendChild(createwanixbind({ dst: '.', src: '#ramfs' }))
}

export function appendzedcafeinboxfilebind(
  sys: WanixSystemElement,
  inboxbytes: number[],
) {
  if (!inboxbytes.length) {
    return
  }
  const existing = sys.querySelector('wanix-bind[data-zss-zed-cafe-inbox-file]')
  if (existing) {
    return
  }
  const bytes = new Uint8Array(inboxbytes)
  const bloburl = URL.createObjectURL(new Blob([bytes]))
  const bind = createwanixbind({
    type: 'file',
    dst: WANIX_ZED_CAFE_INBOX_RAMFS,
    src: bloburl,
  })
  bind.setAttribute('data-zss-zed-cafe-inbox-file', '')
  bind.setAttribute('data-zss-inbox-blob-url', bloburl)
  sys.appendChild(bind)
}

function appendzedcafestagingbinds(sys: WanixSystemElement) {
  sys.appendChild(
    createwanixbind({
      type: 'file',
      dst: WANIX_ZED_CAFE_WASM_RAMFS,
      src: WANIX_ZED_CAFE_WASM_URL,
    }),
  )
}

function appendvmprepbinds(sys: WanixSystemElement, urls: WANIX_VM_ASSET_URLS) {
  sys.appendChild(
    createwanixbind({ dst: '.', src: urls.linux, type: 'archive' }),
  )
  sys.appendChild(createwanixbind({ dst: 'vm', src: '#vm' }))
  sys.appendChild(
    createwanixbind({
      dst: '#vm/v86',
      src: urls.v86,
      type: 'archive',
    }),
  )
}

function revokeinboxblobsurl(bind: Element | null | undefined) {
  if (!bind) {
    return
  }
  const url = bind.getAttribute('data-zss-inbox-blob-url')
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

export function waitwanixbindmount(
  bind: HTMLElement,
  timeoutms = WANIX_BIND_MOUNT_TIMEOUT_MS,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (ok: boolean, err?: Error) => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timer)
      if (ok) {
        resolve()
        return
      }
      reject(err ?? new Error('wanix bind mount failed'))
    }
    const timer = setTimeout(() => {
      finish(false, new Error('wanix bind mount timeout'))
    }, timeoutms)
    bind.addEventListener('mount', () => finish(true), { once: true })
    bind.addEventListener('error', () => {
      finish(false, new Error('wanix bind mount failed'))
    }, { once: true })
    queueMicrotask(() => {
      if (bind.isConnected && bind.hasAttribute('rid')) {
        finish(true)
      }
    })
  })
}

export async function waitforwanixroot(
  system: WanixSystemElement,
  readroot: () => WanixRoot | null,
  timeoutms = WANIX_ROOT_WAIT_TIMEOUT_MS,
): Promise<WanixRoot | null> {
  const cached = readroot()
  if (cached) {
    return cached
  }
  if (system.isReady && system.root) {
    return system.root
  }
  const ready = await new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      system.removeEventListener('ready', onready)
      resolve(false)
    }, timeoutms)
    const onready = () => {
      clearTimeout(timer)
      resolve(true)
    }
    system.addEventListener('ready', onready, { once: true })
    if (system.isReady) {
      clearTimeout(timer)
      system.removeEventListener('ready', onready)
      resolve(true)
    }
  })
  if (!ready) {
    return null
  }
  return system.root ?? readroot()
}

export function iswanixzedcafevmbootexport(
  state: Pick<WanixIframeHostState, 'vm'>,
): boolean {
  return (
    state.vm?.bootstage === 'activating' || state.vm?.bootstage === 'active'
  )
}

/** Poll #task/<rid>/export until gojs has written stats.json. */
export async function waitzedcafeexportready(
  root: WanixRoot,
  taskrid: string,
  timeoutms = WANIX_ZED_CAFE_EXPORT_READY_TIMEOUT_MS,
): Promise<boolean> {
  const exportsrc = readwanixzedcafeexportsrc(taskrid)
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    try {
      const entries = await root.readDir(exportsrc)
      if (
        entries.some(
          (entry) => entry.replace(/\/$/, '') === 'stats.json',
        )
      ) {
        postwanixiframeapilog(
          `zed-cafe export: #task/${taskrid}/export ready (${entries.length} entries)`,
        )
        return true
      }
    } catch {
      // export mount not ready yet
    }
    await new Promise<void>((resolve) =>
      setTimeout(resolve, WANIX_ZED_CAFE_EXPORT_READY_POLL_MS),
    )
  }
  return false
}

/** Poll ./zed-cafe until guest bind is mounted and stats.json is readable. */
export async function waitzedcafeguestready(
  root: WanixRoot,
  timeoutms = WANIX_ZED_CAFE_EXPORT_READY_TIMEOUT_MS,
): Promise<boolean> {
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    try {
      const entries = await root.readDir('zed-cafe')
      if (
        entries.some(
          (entry) => entry.replace(/\/$/, '') === 'stats.json',
        )
      ) {
        postwanixiframeapilog(
          `zed-cafe export: guest zed-cafe ready (${entries.length} entries)`,
        )
        return true
      }
    } catch {
      // guest bind not mounted yet
    }
    await new Promise<void>((resolve) =>
      setTimeout(resolve, WANIX_ZED_CAFE_EXPORT_READY_POLL_MS),
    )
  }
  return false
}

function cleartaskstagingbinds(sys: WanixSystemElement) {
  revokeinboxblobsurl(
    sys.querySelector('wanix-bind[data-zss-zed-cafe-inbox]'),
  )
  sys
    .querySelectorAll('wanix-bind[data-zss-zed-cafe-inbox]')
    .forEach((el) => el.remove())
}

export async function readzedcafeexportprobe(
  root: WanixRoot | null,
  taskrid: string | null,
  zedcafeready: boolean,
  wasm_cmd: string | null,
  vmbootexport = false,
): Promise<WanixZedCafeExportProbe> {
  const probe: WanixZedCafeExportProbe = {
    taskrid,
    zedcafeready,
    wasm_cmd,
    inbox_ramfs_bytes: 'missing',
    inbox_task_bytes: 'missing',
    export_listing: null,
    export_error: null,
  }
  if (!root) {
    probe.inbox_ramfs_bytes = 'root missing'
    return probe
  }
  try {
    const ramfs = await root.readFile(WANIX_ZED_CAFE_INBOX_RAMFS)
    probe.inbox_ramfs_bytes =
      ramfs instanceof Uint8Array ? ramfs.length : String(ramfs).length
  } catch (err) {
    probe.inbox_ramfs_bytes =
      err instanceof Error ? err.message : String(err)
  }
  if (taskrid) {
    try {
      const taskinbox = await root.readFile(WANIX_ZED_CAFE_INBOX_RAMFS)
      probe.inbox_task_bytes =
        taskinbox instanceof Uint8Array ? taskinbox.length : String(taskinbox).length
    } catch (err) {
      probe.inbox_task_bytes =
        err instanceof Error ? err.message : String(err)
    }
  }
  const exportsrc = vmbootexport
    ? WANIX_ZED_CAFE_EXPORT_RAMFS
    : taskrid
      ? readwanixzedcafeexportsrc(taskrid)
      : null
  if (exportsrc) {
    try {
      probe.export_listing = await root.readDir(exportsrc)
    } catch (err) {
      probe.export_error = err instanceof Error ? err.message : String(err)
    }
  }
  return probe
}

export async function collectzedcafeexportramfsfiles(
  root: WanixRoot,
): Promise<WanixZedCafeGuestFile[]> {
  return collectexporttreefiles(root, WANIX_ZED_CAFE_EXPORT_RAMFS)
}

export async function collectzedcafeexportfiles(
  root: WanixRoot,
  taskrid: string,
): Promise<WanixZedCafeGuestFile[]> {
  return collectexporttreefiles(root, readwanixzedcafeexportsrc(taskrid))
}

/** Poll live export, capture on #ramfs, mount guest ./zed-cafe (parallel with gojs start). */
export async function waitandmountzedcafeguestexport(
  sys: WanixSystemElement,
  root: WanixRoot,
  taskrid: string,
  controller: WanixIframeChildController,
  timeoutms = WANIX_ZED_CAFE_EXPORT_READY_TIMEOUT_MS,
): Promise<HTMLElement | null> {
  const exportsrc = readwanixzedcafeexportsrc(taskrid)
  const deadline = Date.now() + timeoutms
  let exportlogged = false
  let captured = false
  let guestbindappended = false

  while (Date.now() < deadline) {
    let exportlive = false
    try {
      const entries = await root.readDir(exportsrc)
      exportlive = entries.some(
        (entry) => entry.replace(/\/$/, '') === 'stats.json',
      )
      if (exportlive && !exportlogged) {
        exportlogged = true
        postwanixiframeapilog(
          `zed-cafe export: #task/${taskrid}/export ready (${entries.length} entries)`,
        )
      }
    } catch {
      exportlive = false
    }

    if (exportlive && !captured) {
      captured = true
      const guestfiles = await collectzedcafeexportfiles(root, taskrid)
      if (!guestfiles.some((file) => file.path === 'stats.json')) {
        postwanixiframeapilog(
          'zed-cafe export: stats.json missing from live export capture',
        )
      } else {
        appendzedcafeexportramfsfilebinds(sys, guestfiles)
        postwanixiframeapilog(
          `zed-cafe export: staging ${guestfiles.length} files on ${WANIX_ZED_CAFE_EXPORT_RAMFS}`,
        )
        const ramfsbind = appendzedcafeexportramfsbind(sys, taskrid)
        if (ramfsbind) {
          wirezedcafeexportbind(ramfsbind, sys, taskrid, controller)
        }
      }
    }

    if (captured && !guestbindappended && (await verifyzedcafeexportramfs(root))) {
      sys
        .querySelectorAll('wanix-bind[data-zss-zed-cafe-export="guest"]')
        .forEach((el) => el.remove())
      const guestbind = createwanixbind({
        dst: 'zed-cafe',
        src: WANIX_ZED_CAFE_EXPORT_RAMFS,
      })
      guestbind.setAttribute('data-zss-zed-cafe-export', 'guest')
      sys.appendChild(guestbind)
      wirezedcafeexportbind(guestbind, sys, taskrid, controller)
      guestbindappended = true
    }

    if (
      await waitzedcafeguestready(
        root,
        WANIX_ZED_CAFE_EXPORT_READY_POLL_MS * 4,
      )
    ) {
      return sys.querySelector(
        'wanix-bind[data-zss-zed-cafe-export="guest"]',
      ) as HTMLElement | null
    }

    await new Promise<void>((resolve) =>
      setTimeout(resolve, WANIX_ZED_CAFE_EXPORT_READY_POLL_MS),
    )
  }

  return null
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
          raw instanceof Uint8Array ? raw : new TextEncoder().encode(String(raw))
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
          raw instanceof Uint8Array ? raw : new TextEncoder().encode(String(raw))
        files.push({ path: rel, data: [...bytes] })
      } catch {
        // skip missing path
      }
      return
    }
    if (entries.length === 0 && rel) {
      try {
        const raw = await root.readFile(path)
        const bytes =
          raw instanceof Uint8Array ? raw : new TextEncoder().encode(String(raw))
        files.push({ path: rel, data: [...bytes] })
      } catch {
        return
      }
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

function revokeguestfileblobsurl(bind: Element | null | undefined) {
  if (!bind) {
    return
  }
  const url = bind.getAttribute('data-zss-guest-blob-url')
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

function revokeexportramfsblobsurl(bind: Element | null | undefined) {
  if (!bind) {
    return
  }
  const url = bind.getAttribute('data-zss-export-ramfs-blob-url')
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

export function appendzedcafeexportramfsfilebinds(
  sys: WanixSystemElement,
  guestfiles: WanixZedCafeGuestFile[],
) {
  sys
    .querySelectorAll('wanix-bind[data-zss-zed-cafe-export-ramfs-file]')
    .forEach((el) => {
      revokeexportramfsblobsurl(el)
      el.remove()
    })

  for (const file of guestfiles) {
    const bytes = new Uint8Array(file.data)
    const bloburl = URL.createObjectURL(new Blob([bytes]))
    const bind = createwanixbind({
      type: 'file',
      dst: `${WANIX_ZED_CAFE_EXPORT_RAMFS}/${file.path}`,
      src: bloburl,
    })
    bind.setAttribute('data-zss-zed-cafe-export-ramfs-file', '')
    bind.setAttribute('data-zss-export-ramfs-blob-url', bloburl)
    sys.appendChild(bind)
  }
}

export function appendzedcafeguestfilebinds(
  sys: WanixSystemElement,
  guestfiles: WanixZedCafeGuestFile[],
) {
  sys
    .querySelectorAll('wanix-bind[data-zss-zed-cafe-guest]')
    .forEach((el) => {
      revokeguestfileblobsurl(el)
      el.remove()
    })

  for (const file of guestfiles) {
    const bytes = new Uint8Array(file.data)
    const bloburl = URL.createObjectURL(new Blob([bytes]))
    const bind = createwanixbind({
      type: 'file',
      dst: `zed-cafe/${file.path}`,
      src: bloburl,
    })
    bind.setAttribute('data-zss-zed-cafe-guest', '')
    bind.setAttribute('data-zss-guest-blob-url', bloburl)
    sys.appendChild(bind)
  }
}

/** Confirm #ramfs inbox bytes exist before gojs start (task fsys=#ramfs). */
export async function stagezedcafetaskforgojs(
  sys: WanixSystemElement,
  root: WanixRoot | null,
  controller: WanixIframeChildController,
  taskrid: string,
): Promise<boolean> {
  cleartaskstagingbinds(sys)

  if (!root) {
    controller.onzedcafeerror(
      new Error('zed-cafe staging: wanix root missing'),
    )
    return false
  }

  let bytes: Uint8Array
  try {
    const raw = await root.readFile(WANIX_ZED_CAFE_INBOX_RAMFS)
    bytes =
      raw instanceof Uint8Array ? raw : new TextEncoder().encode(String(raw))
  } catch {
    controller.onzedcafeerror(
      new Error('zed-cafe staging: cannot read #ramfs/zed-cafe-inbox.json'),
    )
    return false
  }

  if (bytes.length === 0) {
    controller.onzedcafeerror(new Error('zed-cafe staging: inbox empty'))
    return false
  }

  postwanixiframeapilog(
    `zed-cafe export: inbox ready ${bytes.length} bytes rid=${taskrid}`,
  )
  return true
}

/** @deprecated use stagezedcafetaskforgojs */
export async function refreshzedcafeinboxbind(
  sys: WanixSystemElement,
  root: WanixRoot | null,
  controller: WanixIframeChildController,
  taskrid?: string | null,
): Promise<boolean> {
  if (!taskrid) {
    controller.onzedcafeerror(
      new Error('zed-cafe staging: task rid missing'),
    )
    return false
  }
  return stagezedcafetaskforgojs(sys, root, controller, taskrid)
}

export function appendwanixarchivebind(
  sys: WanixSystemElement,
  archive: WanixIframeArchive,
) {
  const bind = createwanixbind({
    type: 'archive',
    dst: archive.mountdst,
    src: archive.src,
  })
  bind.setAttribute('data-zss-archive-id', archive.id)
  sys.appendChild(bind)
  return bind
}

export function appendwanixremotebind(
  sys: WanixSystemElement,
  remote: WanixIframeRemote,
) {
  const existing = sys.querySelector(
    `wanix-bind[data-zss-remote-id="${remote.id}"]`,
  )
  if (existing) {
    return existing as HTMLElement
  }
  const bind = createwanixbind({
    type: 'import',
    dst: remote.mountdst,
    src: remote.url,
  })
  bind.setAttribute('data-zss-remote-id', remote.id)
  sys.appendChild(bind)
  return bind
}

export function wirewanixarchivebind(
  bind: HTMLElement,
  archiveid: string,
  controller: WanixIframeChildController,
) {
  const onmount = () => controller.onarchivemounted(archiveid)
  const onerror = () =>
    controller.onarchiveerror(archiveid, new Error('archive mount failed'))
  bind.addEventListener('mount', onmount, { once: true })
  bind.addEventListener('error', onerror, { once: true })
}

export function wirewanixremotebind(
  bind: HTMLElement,
  remoteid: string,
  controller: WanixIframeChildController,
) {
  const onmount = () => controller.onremotemounted(remoteid)
  const onerror = () =>
    controller.onremoteerror(remoteid, new Error('remote import mount failed'))
  bind.addEventListener('mount', onmount, { once: true })
  bind.addEventListener('error', onerror, { once: true })
}

export function cleartargetwanixels(sys: WanixSystemElement) {
  sys
    .querySelectorAll(
      ':scope > wanix-vm, :scope > wanix-task:not([id="zed-cafe"]), :scope > wanix-term:not([data-zss-zed-cafe-skip])',
    )
    .forEach((el) => el.remove())
}

function appendvmremoteguestbinds(vm: HTMLElement, remotes: WanixIframeRemote[]) {
  for (const remote of remotes) {
    if (
      vm.querySelector(`wanix-bind[data-zss-remote-guest="${remote.id}"]`)
    ) {
      continue
    }
    const bind = createwanixbind({
      dst: remote.mountdst,
      src: remote.mountdst,
    })
    bind.setAttribute('data-zss-remote-guest', remote.id)
    vm.appendChild(bind)
  }
}

function appendvmzedcafestagingbind(vm: HTMLElement) {
  if (vm.querySelector('wanix-bind[data-zss-zed-cafe-export="vm-staging"]')) {
    return
  }
  const bind = createwanixbind({
    dst: 'zed-cafe',
    src: WANIX_ZED_CAFE_EXPORT_RAMFS,
  })
  bind.setAttribute('data-zss-zed-cafe-export', 'vm-staging')
  vm.appendChild(bind)
}

export function appendzedcafeexportramfsbind(
  sys: WanixSystemElement,
  taskrid: string,
) {
  const exportsrc = readwanixzedcafeexportsrc(taskrid)
  const existing = sys.querySelector(
    'wanix-bind[data-zss-zed-cafe-export="ramfs"]',
  )
  if (existing?.getAttribute('src') === exportsrc) {
    return null
  }
  sys
    .querySelectorAll('wanix-bind[data-zss-zed-cafe-export="ramfs"]')
    .forEach((el) => el.remove())
  const bind = createwanixbind({
    dst: WANIX_ZED_CAFE_EXPORT_RAMFS,
    src: exportsrc,
  })
  bind.setAttribute('data-zss-zed-cafe-export', 'ramfs')
  bind.setAttribute('src', exportsrc)
  sys.appendChild(bind)
  return bind
}

export function appendwanixvminitialtree(
  sys: WanixSystemElement,
  vmid: string,
  mem: string,
  remotes: WanixIframeRemote[] = [],
) {
  if (sys.querySelector('wanix-vm')) {
    return sys.querySelector('wanix-vm') as HTMLElement
  }
  const vm = document.createElement('wanix-vm')
  setwanixattrs(vm, {
    export: 'ttyS0',
    term: true,
    mem,
    start: true,
  })
  appendvmzedcafestagingbind(vm)
  appendvmremoteguestbinds(vm, remotes)
  sys.appendChild(vm)
  sys.appendChild(
    createwanixterm('#vm/1/term', { raw: true, vmid }),
  )
  return vm
}

/** @deprecated use appendwanixvminitialtree at system mount time */
export function appendwanixvmtarget(
  sys: WanixSystemElement,
  vmid: string,
  mem: string,
) {
  return appendwanixvminitialtree(sys, vmid, mem)
}

export function clearzedcafeexportbinds(sys: WanixSystemElement) {
  sys
    .querySelectorAll(
      'wanix-bind[data-zss-zed-cafe-export]:not([data-zss-zed-cafe-export="vm-staging"]), wanix-bind[data-zss-zed-cafe-export-fallback]',
    )
    .forEach((el) => el.remove())
}

export function iswanixvmlayout(sys: WanixSystemElement): boolean {
  return !!sys.querySelector('wanix-bind[dst="vm"]')
}

/** Confirm #ramfs/zed-cafe is populated before wanix-vm virtfs bind. */
export async function verifyzedcafeexportramfs(
  root: WanixRoot,
): Promise<boolean> {
  try {
    const entries = await root.readDir(WANIX_ZED_CAFE_EXPORT_RAMFS)
    return entries.some(
      (entry) => entry.replace(/\/$/, '') === 'stats.json',
    )
  } catch {
    return false
  }
}

export function appendzedcafeexportbind(
  sys: WanixSystemElement,
  taskrid: string,
) {
  if (iswanixvmlayout(sys) || sys.querySelector('wanix-vm')) {
    return appendzedcafeexportramfsbind(sys, taskrid)
  }
  const existing = sys.querySelector('wanix-bind[data-zss-zed-cafe-export="guest"]')
  const exportsrc = readwanixzedcafeexportsrc(taskrid)
  if (existing?.getAttribute('src') === exportsrc) {
    return null
  }
  clearzedcafeexportbinds(sys)
  const bind = createwanixbind({
    dst: 'zed-cafe',
    src: exportsrc,
  })
  bind.setAttribute('data-zss-zed-cafe-export', 'guest')
  sys.appendChild(bind)
  return bind
}

export function appendzedcafeexportfallbackbinds(
  sys: WanixSystemElement,
  taskrid: string,
) {
  if (sys.querySelector('wanix-bind[data-zss-zed-cafe-export-fallback]')) {
    return
  }
  const exportsrc = readwanixzedcafeexportsrc(taskrid)
  const ramfsbind = createwanixbind({
    dst: WANIX_ZED_CAFE_EXPORT_RAMFS,
    src: exportsrc,
  })
  ramfsbind.setAttribute('data-zss-zed-cafe-export-fallback', 'ramfs')
  sys.appendChild(ramfsbind)
  ramfsbind.addEventListener(
    'mount',
    () => {
      postwanixiframeapilog('zed-cafe export: fallback #ramfs/zed-cafe mounted')
    },
    { once: true },
  )
  ramfsbind.addEventListener(
    'error',
    () => {
      postwanixiframeapilog('zed-cafe export: fallback #ramfs/zed-cafe mount failed')
    },
    { once: true },
  )
  const guestbind = createwanixbind({
    dst: 'zed-cafe',
    src: WANIX_ZED_CAFE_EXPORT_RAMFS,
  })
  guestbind.setAttribute('data-zss-zed-cafe-export-fallback', 'guest')
  sys.appendChild(guestbind)
  guestbind.addEventListener(
    'mount',
    () => {
      postwanixiframeapilog('zed-cafe export: fallback guest zed-cafe mounted')
    },
    { once: true },
  )
  guestbind.addEventListener(
    'error',
    () => {
      postwanixiframeapilog('zed-cafe export: fallback guest zed-cafe mount failed')
    },
    { once: true },
  )
}

export function wirezedcafeexportbind(
  bind: HTMLElement,
  sys: WanixSystemElement,
  taskrid: string,
  controller: WanixIframeChildController,
) {
  bind.addEventListener(
    'mount',
    () => {
      const dst = bind.getAttribute('dst') ?? 'zed-cafe'
      const src = bind.getAttribute('src') ?? ''
      if (dst.startsWith('#ramfs/')) {
        postwanixiframeapilog(
          `zed-cafe export: export ramfs bind mounted from #task/${taskrid}/export`,
        )
        return
      }
      if (src === WANIX_ZED_CAFE_EXPORT_RAMFS) {
        postwanixiframeapilog(
          `zed-cafe export: guest bind mounted from ${WANIX_ZED_CAFE_EXPORT_RAMFS}`,
        )
        return
      }
      postwanixiframeapilog(
        `zed-cafe export: guest bind mounted from #task/${taskrid}/export`,
      )
    },
    { once: true },
  )
  bind.addEventListener(
    'error',
    () => {
      controller.onzedcafeerror(
        new Error('zed-cafe export bind mount failed — trying #ramfs fallback'),
      )
      appendzedcafeexportfallbackbinds(sys, taskrid)
    },
    { once: true },
  )
}

export function appendwanixgojstasktarget(
  sys: WanixSystemElement,
  taskid: string,
  cmd: string,
) {
  const task = document.createElement('wanix-task')
  setwanixattrs(task, {
    id: taskid,
    type: 'gojs',
    cmd,
  })
  sys.appendChild(task)
  return task
}

/** @deprecated use createwanixroomtree — kept for unit tests */
export function mountwanixsystemtree(
  state: WanixIframeHostState,
): WanixSystemElement | null {
  if (!iswanixroomready(state) && state.room !== 'booting') {
    return null
  }
  return createwanixroomtree(state)
}

export function appendwanixtasktarget(
  sys: WanixSystemElement,
  taskid: string,
  cmd: string,
) {
  const task = document.createElement('wanix-task')
  setwanixattrs(task, {
    id: taskid,
    type: 'wasi',
    term: true,
    cmd,
  })
  sys.appendChild(task)
  sys.appendChild(createwanixterm(`#task/${taskid}/term`))
  return task
}
