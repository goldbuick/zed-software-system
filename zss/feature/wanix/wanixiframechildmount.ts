import type { WanixIframeChildController } from 'zss/feature/wanix/wanixiframechildcontroller'
import {
  WANIX_IFRAME_SYSTEM_ID,
  type WanixIframeArchive,
  type WanixIframeHostState,
  type WanixRoot,
  type WanixSystemElement,
} from 'zss/feature/wanix/wanixiframechildtypes'
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
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    const root = system.root ?? readroot()
    if (root) {
      return root
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 16))
  }
  return null
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
  if (!taskrid) {
    return probe
  }
  try {
    const taskinbox = await root.readFile(WANIX_ZED_CAFE_INBOX_RAMFS)
    probe.inbox_task_bytes =
      taskinbox instanceof Uint8Array ? taskinbox.length : String(taskinbox).length
  } catch (err) {
    probe.inbox_task_bytes =
      err instanceof Error ? err.message : String(err)
  }
  try {
    probe.export_listing = await root.readDir(readwanixzedcafeexportsrc(taskrid))
  } catch (err) {
    probe.export_error = err instanceof Error ? err.message : String(err)
  }
  return probe
}

export async function collectzedcafeexportfiles(
  root: WanixRoot,
  taskrid: string,
): Promise<WanixZedCafeGuestFile[]> {
  const files: WanixZedCafeGuestFile[] = []
  const base = readwanixzedcafeexportsrc(taskrid)

  async function ingest(rel: string) {
    const path = rel ? `${base}/${rel}` : base
    let entries: string[] | null = null
    try {
      entries = await root.readDir(path)
    } catch {
      entries = null
    }
    if (entries === null) {
      const raw = await root.readFile(path)
      const bytes =
        raw instanceof Uint8Array ? raw : new TextEncoder().encode(String(raw))
      files.push({ path: rel, data: [...bytes] })
      return
    }
    if (entries.length === 0 && rel) {
      try {
        const raw = await root.readFile(path)
        const bytes =
          raw instanceof Uint8Array ? raw : new TextEncoder().encode(String(raw))
        files.push({ path: rel, data: [...bytes] })
        return
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

export function cleartargetwanixels(sys: WanixSystemElement) {
  sys
    .querySelectorAll(
      ':scope > wanix-vm, :scope > wanix-task:not([id="zed-cafe"]), :scope > wanix-term:not([data-zss-zed-cafe-skip])',
    )
    .forEach((el) => el.remove())
}

export function appendzedcafeexportbind(
  sys: WanixSystemElement,
  taskrid: string,
) {
  if (sys.querySelector('wanix-bind[data-zss-zed-cafe-export]')) {
    return null
  }
  const bind = createwanixbind({
    dst: 'zed-cafe',
    src: readwanixzedcafeexportsrc(taskrid),
  })
  bind.setAttribute('data-zss-zed-cafe-export', '')
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

/** Build detached wanix-system with attrs set before any connect. */
export function mountwanixsystemtree(
  state: WanixIframeHostState,
): WanixSystemElement | null {
  if (state.phase === 'idle' || state.phase === 'vm-prepared') {
    return null
  }

  const sys = createwanixsystem()

  const istaskphase =
    state.phase === 'task-system' ||
    state.phase === 'task-ready' ||
    state.phase === 'task-active'

  if (istaskphase) {
    appendtaskbinds(sys)
  }

  appendzedcafestagingbinds(sys)

  if (state.phase === 'vm-active') {
    appendvmprepbinds(sys, state.urls)
    const vm = document.createElement('wanix-vm')
    setwanixattrs(vm, {
      export: 'ttyS0',
      term: true,
      mem: state.mem,
      start: true,
    })
    sys.appendChild(vm)
    sys.appendChild(
      createwanixterm('#vm/1/term', { raw: true, vmid: state.vmid }),
    )
  }

  for (const archive of state.archives) {
    appendwanixarchivebind(sys, archive)
  }

  const zedcafetaskrid =
    state.zedcafe?.ready && state.zedcafe.taskrid ? state.zedcafe.taskrid : null
  const guestfiles = state.zedcafe?.guestfiles ?? []
  if (state.phase === 'vm-active' && guestfiles.length > 0) {
    appendzedcafeguestfilebinds(sys, guestfiles)
    postwanixiframeapilog(
      `zed-cafe export: mounted ${guestfiles.length} guest files for VM`,
    )
  } else if (zedcafetaskrid) {
    if (state.phase === 'vm-active') {
      appendzedcafeexportfallbackbinds(sys, zedcafetaskrid)
    } else if (istaskphase) {
      appendzedcafeexportbind(sys, zedcafetaskrid)
    }
  }

  return sys
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
