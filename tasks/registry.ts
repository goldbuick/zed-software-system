import { APP_TASKS } from './groups/app'
import { CI_TASKS } from './groups/ci'
import { CLI_TASKS } from './groups/cli'
import { CONTENT_TASKS } from './groups/content'
import { DAISY_TASKS } from './groups/daisy'
import { DEPLOY_TASKS } from './groups/deploy'
import { DOCS_TASKS } from './groups/docs'
import { E2E_TASKS } from './groups/e2e'
import { LANG_TASKS } from './groups/lang'
import { MEMORY_TASKS } from './groups/memory'
import { NATIVE_TASKS } from './groups/native'
import { WANIX_TASKS } from './groups/wanix'
import type { TaskDef } from './types'

const ALL_TASK_LIST: TaskDef[] = [
  ...APP_TASKS,
  ...CI_TASKS,
  ...CLI_TASKS,
  ...CONTENT_TASKS,
  ...DAISY_TASKS,
  ...DEPLOY_TASKS,
  ...DOCS_TASKS,
  ...E2E_TASKS,
  ...LANG_TASKS,
  ...MEMORY_TASKS,
  ...NATIVE_TASKS,
  ...WANIX_TASKS,
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
  if (!taskmap) {
    taskmap = buildmap()
  }
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
