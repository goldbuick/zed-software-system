import type {
  WanixIframeHostState,
  WanixSystemElement,
} from 'zss/feature/wanix/wanixiframechildtypes'
import {
  appenddormantvmslot,
  appendwanixroomtaskbinds,
  appendwanixroomvmprepbinds,
} from 'zss/feature/wanix/wanixvmslot'
import {
  appendwanixarchivebind,
  appendwanixremotebind,
  appendzedcafeinboxfilebind,
} from 'zss/feature/wanix/wanixiframechildmount'
import { readwanixkernelwasmurl } from 'zss/feature/wanix/wanixvmassets'
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
  state: Pick<WanixIframeHostState, 'archives' | 'remotes' | 'zedcafe'>,
) {
  if (state.zedcafe?.inboxbytes?.length) {
    appendzedcafeinboxfilebind(sys, state.zedcafe.inboxbytes)
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
  appendroomshared(sys, state)
  return sys
}

/** VM-capable room: task binds + linux/v86 + dormant wanix-vm (no VM term until activate). */
export function createvmcapableroomtree(
  state: Pick<
    WanixIframeHostState,
    'archives' | 'remotes' | 'zedcafe' | 'vm' | 'urls'
  >,
): WanixSystemElement {
  const sys = createwanixsystemel()
  appendwanixroomtaskbinds(sys)
  appendwanixroomvmprepbinds(sys, state.urls)
  appendroomshared(sys, state)
  const mem = state.vm?.mem ?? '512M'
  appenddormantvmslot(sys, mem, state.remotes)
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
