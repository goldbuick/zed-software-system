import { useLayoutEffect, useRef } from 'react'
import type { WanixIframeChildController } from 'zss/feature/wanix/wanixiframechildcontroller'
import {
  WANIX_IFRAME_VM_PREP_WAIT_MS,
  WANIX_ZED_CAFE_EXPORT_WAIT_MS,
  waitsystemready,
  waitvmchildready,
} from 'zss/feature/wanix/wanixiframechildcontroller'
import {
  appendwanixarchivebind,
  appendwanixremotebind,
  appendzedcafeinboxfilebind,
  collectzedcafeexportfiles,
  stagezedcafetaskforgojs,
  waitandmountzedcafeguestexport,
  waitforwanixroot,
  waitzedcafeguestready,
  wirewanixarchivebind,
  wirewanixremotebind,
} from 'zss/feature/wanix/wanixiframechildmount'
import { createwanixroomtree } from 'zss/feature/wanix/wanixroombootstrap'
import {
  appendgojstasktarget,
  appendtasktargetpair,
  removetargetpair,
} from 'zss/feature/wanix/wanixtargetmount'
import { activatevmslot } from 'zss/feature/wanix/wanixvmslot'
import { postwanixiframeapilog } from 'zss/feature/wanix/wanixtermiframeprotocol'
import type {
  WanixIframeHostState,
  WanixSystemElement,
  WanixTaskElement,
} from 'zss/feature/wanix/wanixiframechildtypes'
import {
  iswanixroomready,
  iswanixvmexportstage,
} from 'zss/feature/wanix/wanixiframechildtypes'
import { setwanixtermprobeactivetarget } from 'zss/feature/wanix/wanixtermprobe'
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
  const roommounted = useRef(false)
  const lastroommountkey = useRef(-1)
  const mountedarchives = useRef(new Set<string>())
  const mountedremotes = useRef(new Set<string>())
  const spawnedtasks = useRef(new Set<number>())
  const zedcafe = state.zedcafe
  const zedcafegen = zedcafe?.generation ?? 0
  const zedcafecmd = zedcafe?.cmd ?? ''
  const vmexportstage = iswanixvmexportstage(state)
  const vmid = state.vm?.vmid ?? ''
  const vmmem = state.vm?.mem ?? '512M'

  // Boot persistent wanix-system once (never replaceChildren on task/vm ops).
  useLayoutEffect(() => {
    const host = hostref.current
    if (state.room === 'idle') {
      roommounted.current = false
      lastroommountkey.current = -1
      systemref.current = null
      mountedarchives.current.clear()
      mountedremotes.current.clear()
      spawnedtasks.current.clear()
      host?.replaceChildren()
      return
    }
    if (!host) {
      return
    }
    if (
      roommounted.current &&
      systemref.current?.isConnected &&
      lastroommountkey.current === state.roommountkey
    ) {
      return
    }

    const system = createwanixroomtree(state)
    host.replaceChildren()
    host.appendChild(system)
    systemref.current = system
    roommounted.current = true
    lastroommountkey.current = state.roommountkey
    mountedarchives.current.clear()
    mountedremotes.current.clear()
    spawnedtasks.current.clear()

    for (const archive of state.archives) {
      const bind = system.querySelector(
        `wanix-bind[data-zss-archive-id="${archive.id}"]`,
      )
      if (bind) {
        wirewanixarchivebind(bind as HTMLElement, archive.id, controller)
        mountedarchives.current.add(archive.id)
      }
    }
    for (const remote of state.remotes) {
      const bind = system.querySelector(
        `wanix-bind[data-zss-remote-id="${remote.id}"]`,
      )
      if (bind) {
        wirewanixremotebind(bind as HTMLElement, remote.id, controller)
        mountedremotes.current.add(remote.id)
      }
    }

    if (state.room === 'booting') {
      let cancelled = false
      void waitsystemready(system)
        .then((wanixroot) => {
          if (cancelled) {
            return
          }
          controller.onsystemready(wanixroot)
          postwanixiframeapilog('wanix room: system ready')
        })
        .catch((err) => {
          if (cancelled) {
            return
          }
          controller.onsystemerror(
            err instanceof Error ? err : new Error(String(err)),
          )
        })
      return () => {
        cancelled = true
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- room mount keyed by roommountkey
  }, [controller, state.room === 'idle' ? 'idle' : `up-${state.roommountkey}`])

  // Append archive binds added after room boot.
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

  // Append remote import binds added after room boot.
  useLayoutEffect(() => {
    const system = systemref.current
    if (!system) {
      return
    }
    const activeids = new Set(state.remotes.map((remote) => remote.id))
    system
      .querySelectorAll('wanix-bind[data-zss-remote-id]')
      .forEach((element) => {
        const remoteid = element.getAttribute('data-zss-remote-id')
        if (remoteid && !activeids.has(remoteid)) {
          element.remove()
          mountedremotes.current.delete(remoteid)
        }
      })
    for (const remote of state.remotes) {
      if (mountedremotes.current.has(remote.id)) {
        continue
      }
      const bind = appendwanixremotebind(system, remote)
      wirewanixremotebind(bind, remote.id, controller)
      mountedremotes.current.add(remote.id)
    }
  }, [controller, state.remotes])

  // Spawn pending task targets (multi-task — no bulk wipe).
  useLayoutEffect(() => {
    const system = systemref.current
    if (!system || !iswanixroomready(state)) {
      return
    }
    const batch = controller.consumependingtasks()
    for (const pending of batch) {
      if (spawnedtasks.current.has(pending.spawnid)) {
        continue
      }
      spawnedtasks.current.add(pending.spawnid)
      const task = appendtasktargetpair(
        system,
        pending.taskid,
        pending.cmd,
      ) as WanixTaskElement
      let cancelled = false
      void (async () => {
        await task.allocate?.()
        await task.start?.()
        if (cancelled) {
          return
        }
        controller.onspawntaskcomplete(pending.spawnid, {
          taskid: pending.taskid,
          rid: task.rid ?? null,
        })
      })().catch((err) => {
        if (cancelled) {
          return
        }
        controller.onspawntaskerror(
          pending.spawnid,
          err instanceof Error ? err : new Error(String(err)),
        )
      })
    }
  }, [controller, state.pendingtasks, state.taskspawnseq, state.room])

  // Remove halted task targets.
  useLayoutEffect(() => {
    const system = systemref.current
    if (!system) {
      return
    }
    const removeids = controller.consumeremovetasks()
    for (const taskid of removeids) {
      removetargetpair(system, taskid)
    }
  }, [controller, state.removetaskids])

  // Sync probe attach target.
  useLayoutEffect(() => {
    if (state.activetargetid) {
      setwanixtermprobeactivetarget(state.activetargetid)
    }
  }, [state.activetargetid])

  // zed-cafe gojs export daemon.
  useLayoutEffect(() => {
    const system = systemref.current
    if (!system || !zedcafe?.cmd || !iswanixroomready(state)) {
      return
    }
    const runzedcafeexport =
      state.vm?.bootstage !== 'activating' &&
      state.vm?.bootstage !== 'active'
    if (!runzedcafeexport) {
      return
    }

    const existing = system.querySelector(
      `wanix-task[id="${WANIX_ZED_CAFE_TASK_ID}"]`,
    )
    if (existing && state.vm?.bootstage !== 'export' && state.vm?.bootstage !== 'idle') {
      return
    }
    if (existing) {
      existing.remove()
    }

    if (state.zedcafe?.inboxbytes?.length) {
      appendzedcafeinboxfilebind(system, state.zedcafe.inboxbytes)
    }

    const task = appendgojstasktarget(
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
      const wanixroot = await waitforwanixroot(
        system,
        controller.getroot,
        WANIX_ZED_CAFE_EXPORT_WAIT_MS,
      )
      if (cancelled || !wanixroot) {
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
      const inboxstaged = await stagezedcafetaskforgojs(
        system,
        wanixroot,
        controller,
        task.rid,
      )
      if (cancelled || !inboxstaged) {
        return
      }
      postwanixiframeapilog(
        `zed-cafe export: starting gojs task rid=${task.rid ?? 'unknown'}`,
      )
      const mountpromise =
        !vmexportstage && task.rid
          ? waitandmountzedcafeguestexport(
              system,
              wanixroot,
              task.rid,
              controller,
              WANIX_ZED_CAFE_EXPORT_WAIT_MS,
            )
          : Promise.resolve(null)
      await task.start?.()
      if (cancelled || !task.rid) {
        return
      }
      let exportbind: HTMLElement | null = null
      if (!vmexportstage) {
        exportbind = await mountpromise
        if (cancelled) {
          return
        }
        if (!exportbind) {
          controller.onzedcafeerror(
            new Error('zed-cafe export: guest ./zed-cafe never became ready'),
          )
          return
        }
        controller.markzedcafeready()
      }
      if (vmexportstage && !cancelled) {
        try {
          const guestfiles = await collectzedcafeexportfiles(wanixroot, task.rid)
          if (!guestfiles.some((file) => file.path === 'stats.json')) {
            throw new Error(
              'zed-cafe export: stats.json missing from #task export capture',
            )
          }
          controller.markzedcafeready()
          controller.activatevm(guestfiles)
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
  }, [controller, zedcafecmd, zedcafegen, vmexportstage, state.room])

  // Activate dormant VM slot after export (no wanix-system remount).
  useLayoutEffect(() => {
    const system = systemref.current
    if (!system || state.vm?.bootstage !== 'activating') {
      return
    }
    const guestfiles = state.vm.guestfiles ?? state.zedcafe?.guestfiles ?? []
    let cancelled = false

    void (async () => {
      try {
        const wanixroot = await waitforwanixroot(
          system,
          controller.getroot,
          WANIX_ZED_CAFE_EXPORT_WAIT_MS,
        )
        if (cancelled || !wanixroot) {
          throw new Error('wanix room: root missing before vm activation')
        }
        await waitforv86driver(wanixroot, WANIX_IFRAME_VM_PREP_WAIT_MS)
        const taskrid = state.zedcafe?.taskrid
        if (!taskrid) {
          throw new Error('wanix room: zed-cafe export task rid missing before vm activation')
        }
        await activatevmslot(system, state.vm?.mem ?? '512M', taskrid, guestfiles)
        await waitvmchildready(system, WANIX_VM_GUEST_SHELL_MS)
        if (cancelled) {
          return
        }
        controller.markvmactive()
        const vm = system.querySelector('wanix-vm')
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
    })()

    return () => {
      cancelled = true
    }
  }, [controller, state.vm?.bootstage, vmid, vmmem])

  if (state.room === 'idle') {
    return null
  }

  return <div ref={hostref} />
}
