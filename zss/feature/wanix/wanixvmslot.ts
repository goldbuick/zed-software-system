import type {
  WanixIframeRemote,
  WanixSystemElement,
  WanixWakeElement,
  WanixZedCafeGuestFile,
} from 'zss/feature/wanix/wanixiframechildtypes'
import {
  appendzedcafeexportramfsbind,
  setwanixattrs,
  waitwanixbindmount,
} from 'zss/feature/wanix/wanixiframechildmount'
import { applywanixtermprobelayout } from 'zss/feature/wanix/wanixtermprobe'
import {
  WANIX_ZED_CAFE_EXPORT_RAMFS,
  WANIX_ZED_CAFE_WASM_RAMFS,
  WANIX_ZED_CAFE_WASM_URL,
} from 'zss/feature/wanix/wanixzedcafeconstants'
import type { WANIX_VM_ASSET_URLS } from 'zss/feature/wanix/wanixvmassets'
import { postwanixiframeapilog } from 'zss/feature/wanix/wanixtermiframeprotocol'

export const WANIX_DORMANT_VM_TARGET_ID = 'linux-vm'

function createwanixbind(attrs: Record<string, string | boolean | undefined>) {
  const bind = document.createElement('wanix-bind')
  setwanixattrs(bind, attrs)
  return bind
}

/** Task workspace: #ramfs at . plus zed-cafe wasm staging only. */
export function appendwanixroomtaskbinds(sys: WanixSystemElement) {
  sys.appendChild(createwanixbind({ dst: '.', src: '#ramfs' }))
  sys.appendChild(
    createwanixbind({
      type: 'file',
      dst: WANIX_ZED_CAFE_WASM_RAMFS,
      src: WANIX_ZED_CAFE_WASM_URL,
    }),
  )
}

/** VM prep binds — only on VM-capable room boot (not task-only wasm drops). */
export function appendwanixroomvmprepbinds(
  sys: WanixSystemElement,
  urls: WANIX_VM_ASSET_URLS,
) {
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

/** @deprecated use appendwanixroomtaskbinds + appendwanixroomvmprepbinds */
export function appendwanixroombasebinds(
  sys: WanixSystemElement,
  urls: WANIX_VM_ASSET_URLS,
) {
  appendwanixroomtaskbinds(sys)
  appendwanixroomvmprepbinds(sys, urls)
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

function appendvmremoteguestbinds(vm: HTMLElement, remotes: WanixIframeRemote[]) {
  for (const remote of remotes) {
    if (vm.querySelector(`wanix-bind[data-zss-remote-guest="${remote.id}"]`)) {
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

export function appendwanixvmterm(sys: WanixSystemElement) {
  if (sys.querySelector('wanix-term[data-zss-target-kind="vm"]')) {
    return
  }
  const term = document.createElement('wanix-term')
  setwanixattrs(term, {
    path: '#vm/1/term',
    raw: true,
  })
  term.setAttribute('data-zss-target-id', WANIX_DORMANT_VM_TARGET_ID)
  term.setAttribute('data-zss-target-kind', 'vm')
  term.setAttribute('data-zss-vm-term', WANIX_DORMANT_VM_TARGET_ID)
  applywanixtermprobelayout(term)
  sys.appendChild(term)
}

export function appenddormantvmslot(
  sys: WanixSystemElement,
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
  })
  vm.setAttribute('data-zss-dormant-vm', '')
  vm.setAttribute('data-zss-target-id', WANIX_DORMANT_VM_TARGET_ID)
  appendvmzedcafestagingbind(vm)
  appendvmremoteguestbinds(vm, remotes)
  sys.appendChild(vm)
  return vm
}

export function readvmslot(sys: WanixSystemElement): WanixWakeElement | null {
  return sys.querySelector('wanix-vm') as WanixWakeElement | null
}

export function isvmslotactive(sys: WanixSystemElement): boolean {
  const vm = readvmslot(sys)
  return !!vm?.hasAttribute('start')
}

/** Stage guarded export namespace and boot the dormant VM slot without remounting wanix-system. */
export async function activatevmslot(
  sys: WanixSystemElement,
  mem: string,
  taskrid: string,
  guestfiles: WanixZedCafeGuestFile[],
): Promise<WanixWakeElement> {
  const ramfsbind = appendzedcafeexportramfsbind(sys, taskrid)
  postwanixiframeapilog(
    `wanix room: binding ${WANIX_ZED_CAFE_EXPORT_RAMFS} from guarded #task/${taskrid}/export (${guestfiles.length} files)`,
  )

  const bind =
    ramfsbind ??
    (sys.querySelector(
      'wanix-bind[data-zss-zed-cafe-export="ramfs"]',
    ) as HTMLElement | null)
  if (bind) {
    await waitwanixbindmount(bind)
  }

  const vm = readvmslot(sys)
  if (!vm) {
    throw new Error('wanix room: dormant vm slot missing')
  }

  appendwanixvmterm(sys)
  setwanixattrs(vm, { mem, start: true })
  vm.removeAttribute('data-zss-dormant-vm')

  const vmel = vm as WanixWakeElement & { start?: () => Promise<void> }
  if (typeof vmel.start === 'function') {
    await vmel.start()
  }

  postwanixiframeapilog('wanix room: vm slot activated')
  return vmel
}

export async function resetvmslot(sys: WanixSystemElement, mem: string) {
  const vm = sys.querySelector('wanix-vm')
  if (!vm) {
    appenddormantvmslot(sys, mem)
    return
  }
  vm.removeAttribute('start')
  vm.setAttribute('data-zss-dormant-vm', '')
  setwanixattrs(vm as HTMLElement, { mem })
  sys.querySelector('wanix-term[data-zss-target-kind="vm"]')?.remove()
}
