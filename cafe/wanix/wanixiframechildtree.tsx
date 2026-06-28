import { useEffect, useLayoutEffect, useRef } from 'react'
import type { WanixIframeChildController } from 'zss/feature/wanix/wanixiframechildcontroller'
import {
  WANIX_IFRAME_VM_PREP_WAIT_MS,
  WANIX_ZED_CAFE_EXPORT_WAIT_MS,
  waitsystemready,
  waitvmchildready,
} from 'zss/feature/wanix/wanixiframechildcontroller'
import {
  appendwanixarchivebind,
  appendwanixgojstasktarget,
  appendwanixtasktarget,
  appendzedcafeexportbind,
  cleartargetwanixels,
  clearzedcafeexportbinds,
  collectzedcafeexportfiles,
  mountwanixsystemtree,
  stagezedcafetaskforgojs,
  waitforwanixroot,
  waitwanixbindmount,
  waitzedcafeexportready,
  wirewanixarchivebind,
  wirezedcafeexportbind,
} from 'zss/feature/wanix/wanixiframechildmount'
import { postwanixiframeapilog } from 'zss/feature/wanix/wanixtermiframeprotocol'
import type {
  WanixIframeHostState,
  WanixSystemElement,
  WanixTaskElement,
} from 'zss/feature/wanix/wanixiframechildtypes'
import {
  WANIX_VM_GUEST_SHELL_MS,
  waitforv86driver,
} from 'zss/feature/wanix/wanixvmspawnhelpers'
import { WANIX_ZED_CAFE_TASK_ID } from 'zss/feature/wanix/wanixzedcafeconstants'

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
  const vmexportstage =
    state.phase === 'vm-active' && state.bootstage === 'export'
  const vmbootstage = state.phase === 'vm-active' && state.bootstage === 'boot'
  const vmmem = state.phase === 'vm-active' ? state.mem : '512M'
  const taskid = state.phase === 'task-active' ? state.taskid : ''
  const taskcmd = state.phase === 'task-active' ? state.cmd : ''
  const zedcafe = state.zedcafe
  const zedcafegen = zedcafe?.generation ?? 0
  const zedcafecmd = zedcafe?.cmd ?? ''
  const mountkey = state.mountKey

  // Remount wanix-system when mountKey changes (VM spawn requires fresh tree).
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
        wirewanixarchivebind(bind, archive.id, controller)
        mountedarchives.current.add(archive.id)
      }
    }
    // mountKey-only full remount; archives at remount time are wired below, not on every archive change.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mountKey gate
  }, [controller, state.mountKey])

  // Append archive binds added after initial mount.
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
      wirewanixarchivebind(bind, archive.id, controller)
      mountedarchives.current.add(archive.id)
    }
  }, [controller, state.archives])

  // Task target: clear VM/task/term children and spawn wasi task when active.
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
    // taskid/taskcmd are derived from state.taskid/state.cmd when phase is task-active.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- derived task fields
  }, [controller, state.phase, taskid, taskcmd])

  // zed-cafe gojs export daemon (persists across user task spawns).
  useLayoutEffect(() => {
    const system = systemref.current
    if (!system || !zedcafe?.cmd) {
      return
    }

    const runzedcafeexport =
      state.phase === 'task-system' ||
      state.phase === 'task-ready' ||
      state.phase === 'task-active' ||
      vmexportstage

    if (!runzedcafeexport) {
      return
    }

    const existing = system.querySelector(
      `wanix-task[id="${WANIX_ZED_CAFE_TASK_ID}"]`,
    )
    if (existing) {
      existing.remove()
    }
    clearzedcafeexportbinds(system)

    const task = appendwanixgojstasktarget(
      system,
      WANIX_ZED_CAFE_TASK_ID,
      zedcafe.cmd,
    ) as WanixTaskElement

    postwanixiframeapilog(
      `zed-cafe export: gojs task appended cmd=${zedcafe.cmd}`,
    )

    const ontaskerror = () => {
      controller.onzedcafeerror(new Error('zed-cafe gojs task failed'))
    }
    task.addEventListener('error', ontaskerror, { once: true })

    let cancelled = false

    void (async () => {
      const root = await waitforwanixroot(
        system,
        controller.getroot,
        WANIX_ZED_CAFE_EXPORT_WAIT_MS,
      )
      if (cancelled || !root) {
        controller.onzedcafeerror(
          new Error('zed-cafe export: wanix root not ready before staging'),
        )
        return
      }
      await task.allocate?.()
      if (cancelled) {
        return
      }
      if (task.rid) {
        controller.setzedcafetaskrid(task.rid)
      }
      if (!task.rid) {
        controller.onzedcafeerror(
          new Error('zed-cafe export: gojs allocate missing rid'),
        )
        return
      }
      const staged = await stagezedcafetaskforgojs(
        system,
        root,
        controller,
        task.rid,
      )
      if (cancelled || !staged) {
        return
      }
      postwanixiframeapilog(
        `zed-cafe export: starting gojs task rid=${task.rid ?? 'unknown'}`,
      )
      await task.start?.()
      if (cancelled || !task.rid) {
        return
      }
      const exportready = await waitzedcafeexportready(root, task.rid)
      if (cancelled) {
        return
      }
      if (!exportready) {
        controller.onzedcafeerror(
          new Error('zed-cafe export: export tree never became ready'),
        )
        return
      }
      const exportbind = vmexportstage
        ? null
        : appendzedcafeexportbind(system, task.rid)
      if (exportbind) {
        wirezedcafeexportbind(exportbind, system, task.rid, controller)
        try {
          await waitwanixbindmount(exportbind)
        } catch {
          // bind error handler may install #ramfs fallback
        }
      }
      if (vmexportstage && !cancelled) {
        try {
          const guestfiles = await collectzedcafeexportfiles(root, task.rid)
          if (!guestfiles.some((file) => file.path === 'stats.json')) {
            throw new Error(
              'zed-cafe export: stats.json missing from #task export capture',
            )
          }
          controller.markzedcafeready()
          controller.beginvmboot(guestfiles)
        } catch (err) {
          const detail = err instanceof Error ? err.message : String(err)
          postwanixiframeapilog(`zed-cafe export: vm start failed — ${detail}`)
          controller.onspawnvmerror(
            err instanceof Error ? err : new Error(String(err)),
          )
        }
      }
    })().catch((err) => {
      if (cancelled) {
        return
      }
      controller.onzedcafeerror(
        err instanceof Error ? err : new Error(String(err)),
      )
    })

    return () => {
      cancelled = true
      task.removeEventListener('error', ontaskerror)
    }
  }, [controller, mountkey, vmexportstage, zedcafecmd, zedcafegen])

  // Wait for wanix-system ready; VM path also waits for v86 driver + wanix-vm term.
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
      if (state.phase === 'vm-active') {
        if (state.bootstage === 'export') {
          return
        }
        try {
          await waitforv86driver(wanixroot, WANIX_IFRAME_VM_PREP_WAIT_MS)
          await waitvmchildready(system!, WANIX_VM_GUEST_SHELL_MS)
          if (cancelled) {
            return
          }
          const vm = system!.querySelector('wanix-vm')
          controller.onspawnvmcomplete({
            vmid,
            vrid: vm?.rid ?? '1',
          })
        } catch (err) {
          if (cancelled) {
            return
          }
          controller.onspawnvmerror(
            err instanceof Error ? err : new Error(String(err)),
          )
        }
        return
      }
      controller.onsystemready(wanixroot)
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
  }, [controller, state.mountKey, state.phase, state.bootstage, vmid])

  if (state.phase === 'idle' || state.phase === 'vm-prepared') {
    return null
  }

  return <div ref={hostref} />
}
