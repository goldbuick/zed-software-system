import {
  WANIX_IFRAME_SYSTEM_ID,
  type WanixIframeArchive,
  type WanixIframeHostState,
  type WanixSystemElement,
} from 'zss/feature/wanix/wanixiframechildtypes'
import { applywanixtermprobelayout } from 'zss/feature/wanix/wanixtermprobe'
import {
  type WANIX_VM_ASSET_URLS,
  readwanixkernelwasmurl,
} from 'zss/feature/wanix/wanixvmassets'

type WanixAttrValue = string | boolean | undefined

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

export function cleartargetwanixels(sys: WanixSystemElement) {
  sys
    .querySelectorAll(
      ':scope > wanix-vm, :scope > wanix-task, :scope > wanix-term',
    )
    .forEach((el) => el.remove())
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
