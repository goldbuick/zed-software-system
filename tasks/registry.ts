import { BLUME_TASKS } from './groups/blume'
import { CAFE_TASKS } from './groups/cafe'
import { HEADLESS_TASKS } from './groups/headless'
import { OPS_TASKS } from './groups/ops'
import type { TaskDef } from './types'

const ALL_TASK_LIST: TaskDef[] = [
  ...CAFE_TASKS,
  ...BLUME_TASKS,
  ...HEADLESS_TASKS,
  ...OPS_TASKS,
]

let taskmap: Record<string, TaskDef> | undefined

function buildmap(): Record<string, TaskDef> {
  const map: Record<string, TaskDef> = {}
  for (const task of ALL_TASK_LIST) {
    if (map[task.id]) {
      throw new Error(`duplicate task id: ${task.id}`)
    }
    map[task.id] = task
  }
  return map
}

export function gettaskmap(): Record<string, TaskDef> {
  taskmap ??= buildmap()
  return taskmap
}

export function gettask(id: string): TaskDef {
  const task = gettaskmap()[id]
  if (!task) {
    throw new Error(`unknown task: ${id}`)
  }
  return task
}

export function getalltasks(): TaskDef[] {
  return ALL_TASK_LIST
}

export function resolvetaskorder(rootid: string): string[] {
  const map = gettaskmap()
  const order: string[] = []
  const visiting = new Set<string>()
  const done = new Set<string>()

  function visit(id: string) {
    if (done.has(id)) {
      return
    }
    if (visiting.has(id)) {
      throw new Error(`task dependency cycle at ${id}`)
    }
    const task = map[id]
    if (!task) {
      throw new Error(`unknown task dependency: ${id}`)
    }
    visiting.add(id)
    for (const dep of task.deps ?? []) {
      visit(dep)
    }
    visiting.delete(id)
    done.add(id)
    order.push(id)
  }

  visit(rootid)
  return order
}

export function taskidfromsegments(group: string, segments: string[]): string {
  if (segments.length === 0) {
    throw new Error(`missing task path under group ${group}`)
  }
  return [group, ...segments].join(':')
}
