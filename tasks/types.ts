export const TASK_GROUPS = [
  'app',
  'ci',
  'cli',
  'content',
  'daisy',
  'deploy',
  'docs',
  'e2e',
  'lang',
  'memory',
  'native',
  'wanix',
] as const

export type TaskGroup = (typeof TASK_GROUPS)[number]

export const TASK_TAGS = ['ci', 'dev', 'deploy', 'slow', 'calibrate'] as const

export type TaskTag = (typeof TASK_TAGS)[number]

export type TaskContext = {
  root: string
  env: NodeJS.ProcessEnv
  args: string[]
}

export type TaskHandler = (ctx: TaskContext) => number | Promise<number>

export type TaskRun =
  | { kind: 'tasks' }
  | { kind: 'exec'; argv: string[] }
  | { kind: 'shell'; cmd: string }
  | { kind: 'handler'; handler: TaskHandler }

export type TaskDef = {
  id: string
  group: TaskGroup
  description: string
  tags?: TaskTag[]
  env?: Record<string, string>
  deps?: string[]
  run: TaskRun
}
