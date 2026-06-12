import type { TaskDef, TaskGroup, TaskRun, TaskTag } from './types'
import { TASK_GROUPS } from './types'

export function infergroup(id: string): TaskGroup {
  const subject = id.split(':')[0] ?? ''
  if ((TASK_GROUPS as readonly string[]).includes(subject)) {
    return subject as TaskGroup
  }
  throw new Error(`task id "${id}" has unknown group prefix "${subject}"`)
}

type TaskInput = {
  description: string
  tags?: TaskTag[]
  env?: Record<string, string>
  deps?: string[]
  run?: TaskRun
  group?: TaskGroup
}

export function def(id: string, input: TaskInput): TaskDef {
  const run = input.run ?? { kind: 'tasks' as const }
  return {
    id,
    group: input.group ?? infergroup(id),
    description: input.description,
    tags: input.tags,
    env: input.env,
    deps: input.deps,
    run,
  }
}

export function exec(argv: string[]): TaskRun {
  return { kind: 'exec', argv }
}

export function shell(cmd: string): TaskRun {
  return { kind: 'shell', cmd }
}

export function tasksonly(
  id: string,
  description: string,
  deps: string[],
  opts?: Omit<TaskInput, 'description' | 'deps' | 'run'>,
): TaskDef {
  return def(id, {
    description,
    deps,
    ...opts,
    run: { kind: 'tasks' },
  })
}
