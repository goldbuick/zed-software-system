import type { WanixSystemElement, WanixTaskElement } from 'zss/feature/wanix/wanixiframechildtypes'
import { setwanixattrs } from 'zss/feature/wanix/wanixiframechildmount'
import { applywanixtermprobelayout } from 'zss/feature/wanix/wanixtermprobe'
import { WANIX_ZED_CAFE_TASK_ID } from 'zss/feature/wanix/wanixzedcafeconstants'

function createwanixterm(
  path: string,
  opts: { raw?: boolean; targetid: string; targetkind: 'task' | 'vm' },
) {
  const term = document.createElement('wanix-term')
  setwanixattrs(term, {
    path,
    ...(opts.raw ? { raw: true } : {}),
  })
  term.setAttribute('data-zss-target-id', opts.targetid)
  term.setAttribute('data-zss-target-kind', opts.targetkind)
  applywanixtermprobelayout(term)
  return term
}

export function appendtasktargetpair(
  sys: WanixSystemElement,
  taskid: string,
  cmd: string,
): WanixTaskElement {
  const task = document.createElement('wanix-task') as WanixTaskElement
  setwanixattrs(task, {
    id: taskid,
    type: 'wasi',
    term: true,
    cmd,
  })
  task.setAttribute('data-zss-target-id', taskid)
  task.setAttribute('data-zss-target-kind', 'task')
  sys.appendChild(task)
  const term = createwanixterm(`#task/${taskid}/term`, {
    targetid: taskid,
    targetkind: 'task',
  })
  sys.appendChild(term)
  return task
}

export function appendgojstasktarget(
  sys: WanixSystemElement,
  taskid: string,
  cmd: string,
): WanixTaskElement {
  const task = document.createElement('wanix-task') as WanixTaskElement
  setwanixattrs(task, {
    id: taskid,
    type: 'gojs',
    cmd,
  })
  task.setAttribute('data-zss-target-id', taskid)
  task.setAttribute('data-zss-target-kind', 'zed-cafe')
  sys.appendChild(task)
  return task
}

export function removetargetpair(sys: WanixSystemElement, targetid: string) {
  if (targetid === WANIX_ZED_CAFE_TASK_ID) {
    sys
      .querySelector(`wanix-task[id="${WANIX_ZED_CAFE_TASK_ID}"]`)
      ?.remove()
    return
  }
  sys
    .querySelectorAll(`[data-zss-target-id="${targetid}"]`)
    .forEach((el) => el.remove())
  sys.querySelector(`wanix-task[id="${targetid}"]`)?.remove()
}

export function readtargetids(sys: WanixSystemElement): string[] {
  const ids = new Set<string>()
  sys.querySelectorAll('[data-zss-target-id]').forEach((el) => {
    const id = el.getAttribute('data-zss-target-id')
    if (id) {
      ids.add(id)
    }
  })
  return [...ids]
}
