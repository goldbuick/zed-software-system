import { spawnSync } from 'node:child_process'
import path from 'node:path'

import type { TaskContext, TaskHandler } from 'tasks/types'

/** Run a shell script under repo root; script path is relative to ctx.root. */
export function runshellscript(relativepath: string, ctx: TaskContext): number {
  const scriptpath = path.join(ctx.root, relativepath)
  const result = spawnSync('sh', [scriptpath, ...ctx.args], {
    cwd: ctx.root,
    stdio: 'inherit',
    env: ctx.env,
  })
  if (result.error) {
    throw result.error
  }
  return result.status ?? 1
}

/** Wrap a shell script path as a task handler. */
export function shellhandler(relativepath: string): TaskHandler {
  return (ctx) => runshellscript(relativepath, ctx)
}

/** Spawn tsx on a TypeScript module. */
export function runtsx(relativepath: string, ctx: TaskContext): number {
  const result = spawnSync('tsx', [relativepath, ...ctx.args], {
    cwd: ctx.root,
    stdio: 'inherit',
    env: ctx.env,
    shell: false,
  })
  if (result.error) {
    throw result.error
  }
  return result.status ?? 1
}

/** Spawn node on a module. */
export function runnode(relativepath: string, ctx: TaskContext): number {
  const result = spawnSync('node', [relativepath, ...ctx.args], {
    cwd: ctx.root,
    stdio: 'inherit',
    env: ctx.env,
    shell: false,
  })
  if (result.error) {
    throw result.error
  }
  return result.status ?? 1
}
