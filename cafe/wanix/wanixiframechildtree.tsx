import { useLayoutEffect, useRef } from 'react'
import type { WanixIframeChildController } from 'zss/feature/wanix/wanixiframechildcontroller'
import {
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
  waitwanixbindmount,
  waitzedcafeexportready,
  waitzedcafeguestready,
  wirewanixarchivebind,
  wirewanixremotebind,
} from 'zss/feature/wanix/wanixiframechildmount'
import { createwanixroomtree } from 'zss/feature/wanix/wanixroombootstrap'
import {
  appendgojstasktarget,
  removetargetpair,
} from 'zss/feature/wanix/wanixtargetmount'
import { setwanixattrs } from 'zss/feature/wanix/wanixiframechildmount'
import { applywanixtermprobelayout } from 'zss/feature/wanix/wanixtermprobe'
import { WANIX_ZED_CAFE_TASK_ID, WANIX_ZED_CAFE_INBOX_RAMFS } from 'zss/feature/wanix/wanixzedcafeconstants'
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
import { WANIX_VM_GUEST_SHELL_MS } from 'zss/feature/wanix/wanixvmspawnhelpers'

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
  const zedcafeexportgen = useRef(-1)
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
      zedcafeexportgen.current = -1
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
    zedcafeexportgen.current = -1
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
      const task = document.createElement('wanix-task') as WanixTaskElement
      setwanixattrs(task, {
        id: pending.taskid,
        type: 'wasi',
        term: true,
        cmd: pending.cmd,
      })
      task.setAttribute('data-zss-target-id', pending.taskid)
      task.setAttribute('data-zss-target-kind', 'task')
      system.appendChild(task)
      let cancelled = false
      void (async () => {
        await task.allocate?.()
        const termpath = (task as { term?: string }).term
        if (termpath) {
          const term = document.createElement('wanix-term')
          setwanixattrs(term, {
            path: termpath,
            raw: true,
          })
          term.setAttribute('data-zss-target-id', pending.taskid)
          term.setAttribute('data-zss-target-kind', 'task')
          applywanixtermprobelayout(term)
          system.appendChild(term)
          if (system.isReady) {
            const wake = term as HTMLElement & { _awake?: () => void }
            wake._awake?.()
          }
        }
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
    if (state.vmcapable && !state.vm) {
      return
    }

    const existing = system.querySelector(
      `wanix-task[id="${WANIX_ZED_CAFE_TASK_ID}"]`,
    )
    if (existing && zedcafeexportgen.current === zedcafegen) {
      return
    }
    if (existing) {
      existing.remove()
    }
    zedcafeexportgen.current = zedcafegen

    const inboxbytes = state.zedcafe?.inboxbytes ?? []

    if (inboxbytes.length) {
      appendzedcafeinboxfilebind(system, inboxbytes)
    }

    const inboxbind = system.querySelector(
      'wanix-bind[data-zss-zedcafe-inbox-file]',
    )

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

    const launchgen = zedcafegen

    void (async () => {
      let wanixroot = controller.getroot()
      if (!wanixroot) {
        wanixroot = await waitforwanixroot(
          system,
          controller.getroot,
          WANIX_ZED_CAFE_EXPORT_WAIT_MS,
        )
      }
      if (launchgen !== zedcafeexportgen.current) {
        postwanixiframeapilog(
          `zed-cafe export: gojs async stale gen=${launchgen} current=${zedcafeexportgen.current}`,
        )
        return
      }
      if (!wanixroot) {
        controller.onzedcafeerror(
          new Error('zed-cafe export: wanix root not ready before staging'),
        )
        return
      }
      postwanixiframeapilog('zed-cafe export: gojs root ready')
      if (inboxbytes.length && iswanixvmexportstage(controller.getstate())) {
        await wanixroot.writeFile(
          WANIX_ZED_CAFE_INBOX_RAMFS,
          new Uint8Array(inboxbytes),
        )
      } else if (inboxbind) {
        try {
          await waitwanixbindmount(inboxbind)
        } catch {
          controller.onzedcafeerror(
            new Error('zed-cafe staging: inbox bind mount failed'),
          )
          return
        }
      }
      await task.allocate?.()
      if (launchgen !== zedcafeexportgen.current) {
        postwanixiframeapilog(
          `zed-cafe export: gojs async stale after allocate gen=${launchgen}`,
        )
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
      if (launchgen !== zedcafeexportgen.current || !inboxstaged) {
        return
      }
      postwanixiframeapilog(
        `zed-cafe export: starting gojs task rid=${task.rid ?? 'unknown'}`,
      )
      await task.start?.()
      if (launchgen !== zedcafeexportgen.current || !task.rid) {
        return
      }
      if (iswanixvmexportstage(controller.getstate())) {
        try {
          const exportready = await waitzedcafeexportready(
            wanixroot,
            task.rid,
            WANIX_ZED_CAFE_EXPORT_WAIT_MS,
          )
          if (launchgen !== zedcafeexportgen.current) {
            return
          }
          if (!exportready) {
            throw new Error(
              'zed-cafe export: stats.json missing from #task export capture',
            )
          }
          const guestfiles = await collectzedcafeexportfiles(wanixroot, task.rid)
          if (!guestfiles.some((file) => file.path === 'stats.json')) {
            throw new Error(
              'zed-cafe export: stats.json missing from #task export capture',
            )
          }
          controller.markzedcafeready()
          controller.activatevm(guestfiles)
        } catch (err) {
          if (launchgen !== zedcafeexportgen.current) {
            return
          }
          const detail = err instanceof Error ? err.message : String(err)
          postwanixiframeapilog(`zed-cafe export: vm start failed — ${detail}`)
          controller.onspawnvmerror(
            err instanceof Error ? err : new Error(String(err)),
          )
        }
        return
      }
      const exportbind = await waitandmountzedcafeguestexport(
        system,
        wanixroot,
        task.rid,
        controller,
        WANIX_ZED_CAFE_EXPORT_WAIT_MS,
      )
      if (launchgen !== zedcafeexportgen.current) {
        return
      }
      if (!exportbind) {
        controller.onzedcafeerror(
          new Error('zed-cafe export: guest ./zedcafe never became ready'),
        )
        return
      }
      controller.markzedcafeready()
    })().catch((err) => {
      if (launchgen !== zedcafeexportgen.current) {
        return
      }
      controller.onzedcafeerror(
        err instanceof Error ? err : new Error(String(err)),
      )
    })

    return () => {
      task.removeEventListener('error', ontaskerror)
    }
  }, [controller, zedcafecmd, zedcafegen, vmexportstage, state.room, state.vmcapable, state.vm?.bootstage])

  // Wait for boot-phase wanix-vm after export remount (vm must be initial child before ready).
  useLayoutEffect(() => {
    const system = systemref.current
    if (
      !system ||
      state.vm?.bootstage !== 'activating' ||
      state.room !== 'ready'
    ) {
      return
    }
    let cancelled = false

    void (async () => {
      try {
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
        const detail = err instanceof Error ? err.message : String(err)
        postwanixiframeapilog(`zed-cafe export: vm activation failed — ${detail}`)
        controller.onspawnvmerror(
          err instanceof Error ? err : new Error(String(err)),
        )
      }
    })()

    return () => {
      cancelled = true
    }
  }, [controller, state.vm?.bootstage, state.room, state.roommountkey, vmid, vmmem])

  if (state.room === 'idle') {
    return null
  }

  return <div ref={hostref} />
}
