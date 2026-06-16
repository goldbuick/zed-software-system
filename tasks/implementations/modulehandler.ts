import { spawnSync } from 'node:child_process'

import { handler } from 'tasks/helpers'
import { runnode, runshellscript, runtsx } from 'tasks/shellutil'
import type { TaskRun } from 'tasks/types'

export function nodehandler(
  relativepath: string,
  prefixargs: string[] = [],
): TaskRun {
  return handler((ctx) =>
    runnode(relativepath, {
      ...ctx,
      args: [...prefixargs, ...ctx.args],
    }),
  )
}

export function tsxhandler(
  relativepath: string,
  prefixargs: string[] = [],
): TaskRun {
  return handler((ctx) =>
    runtsx(relativepath, {
      ...ctx,
      args: [...prefixargs, ...ctx.args],
    }),
  )
}

export function shellhandlerwithargs(
  relativepath: string,
  prefixargs: string[] = [],
): TaskRun {
  return handler((ctx) =>
    runshellscript(relativepath, {
      ...ctx,
      args: [...prefixargs, ...ctx.args],
    }),
  )
}

export function pythonhandler(relativepath: string): TaskRun {
  return handler((ctx) => {
    const result = spawnSync('python3', [relativepath, ...ctx.args], {
      cwd: ctx.root,
      stdio: 'inherit',
      env: ctx.env,
      shell: false,
    })
    if (result.error) {
      throw result.error
    }
    return result.status ?? 1
  })
}
