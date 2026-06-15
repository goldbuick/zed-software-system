import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { gettask, gettaskmap, resolvetaskorder } from './registry'
import type { TaskDef } from './types'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

export function taskroot(): string {
  return ROOT
}

function mergedenv(
  task: TaskDef,
  inherited: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  return { ...inherited, ...task.env }
}

function runexec(
  argv: string[],
  env: NodeJS.ProcessEnv,
  extraargs: string[] = [],
): number {
  const fullargv = [...argv, ...extraargs]
  const [command, ...args] = fullargv
  if (!command) {
    throw new Error('exec task missing command')
  }
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env,
    shell: false,
  })
  if (result.error) {
    throw result.error
  }
  return result.status ?? 1
}

function runshell(cmd: string, env: NodeJS.ProcessEnv): number {
  const result = spawnSync(cmd, {
    cwd: ROOT,
    stdio: 'inherit',
    env,
    shell: true,
  })
  if (result.error) {
    throw result.error
  }
  return result.status ?? 1
}

function runbody(
  task: TaskDef,
  env: NodeJS.ProcessEnv,
  extraargs: string[],
): number {
  const run = task.run
  if (run.kind === 'tasks') {
    return 0
  }
  if (run.kind === 'exec') {
    return runexec(run.argv, env, extraargs)
  }
  if (run.kind === 'shell') {
    if (extraargs.length > 0) {
      return runshell(`${run.cmd} ${extraargs.join(' ')}`, env)
    }
    return runshell(run.cmd, env)
  }
  const args = [...(run.args ?? []), ...extraargs]
  return runexec(['node', run.file, ...args], env)
}

function runone(
  id: string,
  inheritedenv: NodeJS.ProcessEnv,
  extraargs: string[],
): number {
  const task = gettask(id)
  const env = mergedenv(task, inheritedenv)
  for (const dep of task.deps ?? []) {
    const code = runone(dep, env, [])
    if (code !== 0) {
      return code
    }
  }
  return runbody(task, env, extraargs)
}

export function runtask(
  id: string,
  extraargs: string[] = [],
  inheritedenv: NodeJS.ProcessEnv = process.env,
): number {
  return runone(id, inheritedenv, extraargs)
}

export function explaintask(id: string): { order: string[]; tasks: TaskDef[] } {
  const order = resolvetaskorder(id)
  return {
    order,
    tasks: order.map((taskid) => gettask(taskid)),
  }
}

export function listtasks(filter?: {
  group?: string
  tag?: string
}): TaskDef[] {
  const all = Object.values(gettaskmap())
  return all
    .filter((task) => !filter?.group || task.group === filter.group)
    .filter((task) => !filter?.tag || task.tags?.includes(filter.tag as never))
    .sort((a, b) => a.id.localeCompare(b.id))
}
