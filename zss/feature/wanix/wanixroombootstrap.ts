import type {
  WanixIframeHostState,
  WanixSystemElement,
} from 'zss/feature/wanix/wanixiframechildtypes'
import {
  appenddormantvmslot,
  appendvmbootslot,
  appendwanixroomtaskbinds,
  appendwanixroomvmprepbinds,
} from 'zss/feature/wanix/wanixvmslot'
import {
  appendwanixarchivebind,
  appendwanixremotebind,
  appendzedcafebootstrapbinds,
  appendzedcafeinboxfilebind,
  haszedcafebootstrapguestfiles,
} from 'zss/feature/wanix/wanixiframechildmount'
import {
  DEFAULT_WANIX_VM_MEM,
  readwanixkernelwasmurl,
} from 'zss/feature/wanix/wanixvmassets'
import { WANIX_IFRAME_SYSTEM_ID } from 'zss/feature/wanix/wanixiframechildtypes'
import { setwanixattrs } from 'zss/feature/wanix/wanixiframechildmount'

export function createwanixsystemel(): WanixSystemElement {
  const sys = document.createElement('wanix-system') as WanixSystemElement
  setwanixattrs(sys, {
    wasm: readwanixkernelwasmurl(),
    'allow-origins': '*',
    debug: true,
    id: WANIX_IFRAME_SYSTEM_ID,
  })
  return sys
}

function appendroomshared(
  sys: WanixSystemElement,
  state: Pick<WanixIframeHostState, 'archives' | 'remotes' | 'zedcafe' | 'vmcapable'>,
) {
  if (state.zedcafe?.inboxbytes?.length) {
    appendzedcafeinboxfilebind(sys, state.zedcafe.inboxbytes)
  }
  const guestfiles = state.zedcafe?.guestfiles
  if (haszedcafebootstrapguestfiles(guestfiles)) {
    appendzedcafebootstrapbinds(sys, guestfiles!, {
      includetaskguest: !state.vmcapable,
    })
  }
  for (const archive of state.archives) {
    appendwanixarchivebind(sys, archive)
  }
  for (const remote of state.remotes) {
    appendwanixremotebind(sys, remote)
  }
}

/** Lightweight task room: #ramfs workspace only (no linux/vm binds). */
export function createtaskroomtree(
  state: Pick<
    WanixIframeHostState,
    'archives' | 'remotes' | 'zedcafe' | 'vm'
  >,
): WanixSystemElement {
  const sys = createwanixsystemel()
  appendwanixroomtaskbinds(sys)
  appendroomshared(sys, { ...state, vmcapable: false })
  return sys
}

export function createvmcapableroomtree(
  state: Pick<
    WanixIframeHostState,
    'archives' | 'remotes' | 'zedcafe' | 'vm' | 'urls' | 'vmcapable'
  >,
): WanixSystemElement {
  const sys = createwanixsystemel()
  appendwanixroomtaskbinds(sys)
  appendwanixroomvmprepbinds(sys, state.urls)
  appendroomshared(sys, { ...state, vmcapable: true })
  if (state.vmcapable) {
    const vmmem = state.vm?.mem ?? DEFAULT_WANIX_VM_MEM
    const guestfiles =
      state.vm?.guestfiles ?? state.zedcafe?.guestfiles ?? []
    if (haszedcafebootstrapguestfiles(guestfiles)) {
      appendvmbootslot(sys, vmmem, guestfiles, state.remotes)
    } else {
      appenddormantvmslot(sys, vmmem, state.remotes)
    }
  }
  return sys
}

/** Build room tree from host state vmcapable flag. */
export function createwanixroomtree(
  state: Pick<
    WanixIframeHostState,
    'archives' | 'remotes' | 'zedcafe' | 'vm' | 'urls' | 'vmcapable'
  >,
): WanixSystemElement {
  if (state.vmcapable) {
    return createvmcapableroomtree(state)
  }
  return createtaskroomtree(state)
}
