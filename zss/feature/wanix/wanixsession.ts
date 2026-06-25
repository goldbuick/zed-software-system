export type WANIX_ATTACH_KIND = 'task' | 'vm'

export type WANIX_TASK_STATE = {
  id: string
  label: string
  entrycmd: string
  autotiletriggered?: boolean
}

export type WANIX_VM_STATE = {
  id: string
  label: string
  mem: string
  autotiletriggered?: boolean
}

const tasks = new Map<string, WANIX_TASK_STATE>()
const vms = new Map<string, WANIX_VM_STATE>()
let attachedid: string | null = null
let attachedkind: WANIX_ATTACH_KIND | null = null
let termrouting = false

export function readwanixtasks(): WANIX_TASK_STATE[] {
  return [...tasks.values()]
}

export function readwanixvms(): WANIX_VM_STATE[] {
  return [...vms.values()]
}

export function readwanixtask(taskid: string): WANIX_TASK_STATE | undefined {
  return tasks.get(taskid)
}

export function readwanixvm(vmid: string): WANIX_VM_STATE | undefined {
  return vms.get(vmid)
}

export function readwanixattached(): string | null {
  return attachedid
}

export function readwanixattachedkind(): WANIX_ATTACH_KIND | null {
  return attachedkind
}

export function iswanixtermraw(): boolean {
  return termrouting && attachedkind === 'vm'
}

export function iswanixtermactive(): boolean {
  if (!termrouting || attachedid == null || attachedkind == null) {
    return false
  }
  if (attachedkind === 'task') {
    return tasks.has(attachedid)
  }
  return vms.has(attachedid)
}

export function registertask(entry: WANIX_TASK_STATE) {
  tasks.set(entry.id, entry)
}

export function registervm(entry: WANIX_VM_STATE) {
  vms.set(entry.id, entry)
}

export function removetask(taskid: string) {
  tasks.delete(taskid)
  if (attachedkind === 'task' && attachedid === taskid) {
    attachedid = null
    attachedkind = null
    termrouting = false
  }
}

export function removevm(vmid: string) {
  vms.delete(vmid)
  if (attachedkind === 'vm' && attachedid === vmid) {
    attachedid = null
    attachedkind = null
    termrouting = false
  }
}

export function setwanixattached(
  kind: WANIX_ATTACH_KIND | null,
  id: string | null,
) {
  attachedkind = kind
  attachedid = id
  if (kind == null || id == null) {
    termrouting = false
    return
  }
  termrouting =
    (kind === 'task' && tasks.has(id)) || (kind === 'vm' && vms.has(id))
}

export function setwanixtermrouting(on: boolean) {
  if (!attachedid || !attachedkind) {
    termrouting = false
    return
  }
  const exists =
    attachedkind === 'task' ? tasks.has(attachedid) : vms.has(attachedid)
  termrouting = on && exists
}

export function clearwanixtasks() {
  tasks.clear()
  if (attachedkind === 'task') {
    attachedid = null
    attachedkind = null
    termrouting = false
  }
}

export function clearwanixvms() {
  vms.clear()
  if (attachedkind === 'vm') {
    attachedid = null
    attachedkind = null
    termrouting = false
  }
}

export function haswanixtasks(): boolean {
  return tasks.size > 0
}

export function haswanixvms(): boolean {
  return vms.size > 0
}

export function haswanixcompute(): boolean {
  return tasks.size > 0 || vms.size > 0
}

export function readwanixautotiletriggered(
  kind: WANIX_ATTACH_KIND,
  id: string,
): boolean {
  if (kind === 'task') {
    return tasks.get(id)?.autotiletriggered ?? false
  }
  return vms.get(id)?.autotiletriggered ?? false
}

export function setwanixautotiletriggered(kind: WANIX_ATTACH_KIND, id: string) {
  if (kind === 'task') {
    const task = tasks.get(id)
    if (task) {
      tasks.set(id, { ...task, autotiletriggered: true })
    }
    return
  }
  const vm = vms.get(id)
  if (vm) {
    vms.set(id, { ...vm, autotiletriggered: true })
  }
}

export function clearwanixautotileflags() {
  for (const [id, task] of tasks) {
    if (task.autotiletriggered) {
      tasks.set(id, { ...task, autotiletriggered: false })
    }
  }
  for (const [id, vm] of vms) {
    if (vm.autotiletriggered) {
      vms.set(id, { ...vm, autotiletriggered: false })
    }
  }
}

/** Test hook — reset module state. */
export function resetwanixsessionfortest() {
  tasks.clear()
  vms.clear()
  attachedid = null
  attachedkind = null
  termrouting = false
}
