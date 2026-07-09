import { spawnSync } from 'node:child_process'
import path from 'node:path'

import type { TaskContext, TaskHandler } from 'tasks/types'

export function taskenv(ctx: TaskContext): NodeJS.ProcessEnv {
  return { ...process.env, ...ctx.env }
}

export function requiretaskenv(ctx: TaskContext, key: string): string {
  const value = taskenv(ctx)[key]
  if (!value) {
    console.error(`set ${key}`)
    return ''
  }
  return value
}

export function spawntask(
  cmd: string,
  args: string[],
  ctx: TaskContext,
  opts: { inherit?: boolean; env?: NodeJS.ProcessEnv } = {},
): number {
  const result = spawnSync(cmd, args, {
    cwd: ctx.root,
    stdio: opts.inherit ? 'inherit' : 'pipe',
    env: { ...taskenv(ctx), ...opts.env },
  })
  if (result.status !== 0 && !opts.inherit) {
    if (result.stderr) {
      process.stderr.write(result.stderr)
    }
    if (result.stdout) {
      process.stdout.write(result.stdout)
    }
  }
  if (result.error) {
    throw result.error
  }
  return result.status ?? 1
}

export function runjest(
  ctx: TaskContext,
  paths: string | string[],
  extra: string[] = [],
  opts: { env?: NodeJS.ProcessEnv } = {},
): number {
  const targets = typeof paths === 'string' ? [paths] : paths
  return spawntask(
    'yarn',
    ['jest', '--config', 'ops/jest.config.ts', ...targets, ...extra],
    ctx,
    { inherit: true, env: opts.env },
  )
}

export function checkrg(label: string, pattern: string, cwd: string): boolean {
  const result = spawnSync(
    'rg',
    ['-q', pattern, 'zss', 'cafe', '--glob', '*.{ts,tsx}'],
    { cwd, encoding: 'utf8' },
  )
  if (result.status === 0) {
    console.log(`FAIL: ${label}`)
    spawnSync('rg', [pattern, 'zss', 'cafe', '--glob', '*.{ts,tsx}'], {
      cwd,
      stdio: 'inherit',
    })
    return false
  }
  return true
}

/** Run a shell script under repo root; script path is relative to ctx.root. */
export function runshellscript(relativepath: string, ctx: TaskContext): number {
  const scriptpath = path.join(ctx.root, relativepath)
  return spawntask('sh', [scriptpath, ...ctx.args], ctx, { inherit: true })
}

/** Wrap a shell script path as a task handler. */
export function shellhandler(relativepath: string): TaskHandler {
  return (ctx) => runshellscript(relativepath, ctx)
}

/** Spawn tsx on a TypeScript module. */
export function runtsx(relativepath: string, ctx: TaskContext): number {
  return spawntask('tsx', [relativepath, ...ctx.args], ctx, { inherit: true })
}

/** Spawn node on a module. */
export function runnode(relativepath: string, ctx: TaskContext): number {
  return spawntask('node', [relativepath, ...ctx.args], ctx, { inherit: true })
}
