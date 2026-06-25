import { useEffect, useLayoutEffect, useRef } from 'react'
import type { WanixIframeChildController } from 'zss/feature/wanix/wanixiframechildcontroller'
import {
  WANIX_IFRAME_VM_PREP_WAIT_MS,
  waitsystemready,
  waitvmchildready,
} from 'zss/feature/wanix/wanixiframechildhelpers'
import {
  appendwanixarchivebind,
  appendwanixtasktarget,
  cleartargetwanixels,
  mountwanixsystemtree,
} from 'zss/feature/wanix/wanixiframechildmount'
import type {
  WanixIframeHostState,
  WanixSystemElement,
  WanixTaskElement,
} from 'zss/feature/wanix/wanixiframechildtypes'
import {
  VM_TERM_READY_MS,
  waitforv86driver,
} from 'zss/feature/wanix/wanixvmspawnhelpers'

function wirearchivebind(
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

export function WanixIframeChildTree({
  state,
  controller,
}: {
  state: WanixIframeHostState
  controller: WanixIframeChildController
}) {
  const hostref = useRef<HTMLDivElement>(null)
  const systemref = useRef<WanixSystemElement | null>(null)
  const mountedarchives = useRef(new Set<string>())
  const vmid = state.phase === 'vm-active' ? state.vmid : ''
  const taskid = state.phase === 'task-active' ? state.taskid : ''
  const taskcmd = state.phase === 'task-active' ? state.cmd : ''

  useLayoutEffect(() => {
    const host = hostref.current
    if (!host) {
      return
    }

    host.replaceChildren()
    systemref.current = null
    mountedarchives.current.clear()

    const system = mountwanixsystemtree(state)
    if (!system) {
      return
    }

    host.appendChild(system)
    systemref.current = system

    for (const archive of state.archives) {
      if (mountedarchives.current.has(archive.id)) {
        continue
      }
      const bind = system.querySelector(
        `wanix-bind[data-zss-archive-id="${archive.id}"]`,
      )
      if (bind) {
        wirearchivebind(bind, archive.id, controller)
        mountedarchives.current.add(archive.id)
      }
    }
  }, [controller, state.mountKey])

  useLayoutEffect(() => {
    const system = systemref.current
    if (!system) {
      return
    }

    for (const archive of state.archives) {
      if (mountedarchives.current.has(archive.id)) {
        continue
      }
      const bind = appendwanixarchivebind(system, archive)
      wirearchivebind(bind, archive.id, controller)
      mountedarchives.current.add(archive.id)
    }
  }, [controller, state.archives])

  useLayoutEffect(() => {
    const system = systemref.current
    if (!system) {
      return
    }

    const istaskphase =
      state.phase === 'task-system' ||
      state.phase === 'task-ready' ||
      state.phase === 'task-active'

    if (!istaskphase) {
      return
    }

    cleartargetwanixels(system)
    if (state.phase !== 'task-active') {
      return
    }

    const task = appendwanixtasktarget(
      system,
      state.taskid,
      state.cmd,
    ) as WanixTaskElement

    let cancelled = false

    void (async () => {
      await task.allocate?.()
      await task.start?.()
      if (cancelled) {
        return
      }
      controller.onspawntaskcomplete({
        taskid: state.taskid,
        rid: task.rid ?? null,
      })
    })().catch((err) => {
      if (cancelled) {
        return
      }
      controller.onspawntaskerror(
        err instanceof Error ? err : new Error(String(err)),
      )
    })

    return () => {
      cancelled = true
    }
  }, [controller, state.phase, taskid, taskcmd])

  useEffect(() => {
    const system = systemref.current
    if (!system) {
      return
    }
    let cancelled = false

    async function bootsystem() {
      const wanixroot = await waitsystemready(system!)
      if (cancelled) {
        return
      }
      controller.setroot(wanixroot)
      controller.onsystemready(wanixroot)

      if (state.phase === 'vm-active') {
        await waitforv86driver(wanixroot, WANIX_IFRAME_VM_PREP_WAIT_MS)
        const vm = await waitvmchildready(system!, VM_TERM_READY_MS)
        if (cancelled) {
          return
        }
        controller.onspawnvmcomplete({
          vmid,
          vrid: vm.rid ?? '1',
        })
      }
    }

    void bootsystem().catch((err) => {
      if (cancelled) {
        return
      }
      const error = err instanceof Error ? err : new Error(String(err))
      if (state.phase === 'vm-active') {
        controller.onspawnvmerror(error)
        return
      }
      controller.onsystemerror(error)
    })

    return () => {
      cancelled = true
    }
  }, [controller, state.mountKey, state.phase, vmid])

  if (state.phase === 'idle' || state.phase === 'vm-prepared') {
    return null
  }

  return <div ref={hostref} />
}
