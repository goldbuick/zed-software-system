import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

import type { TaskContext } from 'tasks/types'
import { taskenv } from 'tasks/shellutil'

/** Blume static docs into cafe/dist/docs, then Vite cafe app. */
export function runcafebuild(ctx: TaskContext, opts: { tsc?: boolean } = {}): number {
  const env = taskenv(ctx)
  const docsiteroot = join(ctx.root, 'docs-site')
  const blumebin = join(ctx.root, 'node_modules', '.bin', 'blume')
  const blumedist = join(docsiteroot, 'dist')
  const cafedocs = join(ctx.root, 'cafe', 'dist', 'docs')

  if (opts.tsc) {
    const tsc = spawnSync('tsc', [], {
      cwd: ctx.root,
      env,
      stdio: 'inherit',
    })
    if ((tsc.status ?? 1) !== 0) {
      return tsc.status ?? 1
    }
  }

  const blume = spawnSync(blumebin, ['build'], {
    cwd: docsiteroot,
    env,
    stdio: 'inherit',
  })
  if ((blume.status ?? 1) !== 0) {
    return blume.status ?? 1
  }

  const vite = spawnSync('vite', ['build'], {
    cwd: ctx.root,
    env,
    stdio: 'inherit',
  })
  if ((vite.status ?? 1) !== 0) {
    return vite.status ?? 1
  }

  if (!existsSync(blumedist)) {
    console.error('blume build produced no docs-site/dist')
    return 1
  }

  rmSync(cafedocs, { recursive: true, force: true })
  mkdirSync(cafedocs, { recursive: true })
  cpSync(blumedist, cafedocs, { recursive: true })
  console.log(`merged Blume docs into cafe/dist/docs`)
  return 0
}
