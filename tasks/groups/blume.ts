import { def, handler } from '../helpers'
import type { TaskDef } from '../types'

export const BLUME_TASKS: TaskDef[] = [
  def('blume:dev', {
    description:
      'Start Blume docs site (docs-site/) — http://localhost:4321/docs/',
    tags: ['dev'],
    run: handler(async (ctx) => {
      const { spawnSync } = await import('node:child_process')
      const { join } = await import('node:path')
      const { taskenv } = await import('tasks/shellutil')
      const docsiteroot = join(ctx.root, 'docs-site')
      const blumebin = join(ctx.root, 'node_modules', '.bin', 'blume')
      const result = spawnSync(blumebin, ['dev', ...ctx.args], {
        cwd: docsiteroot,
        env: taskenv(ctx),
        stdio: 'inherit',
      })
      if (result.error) {
        throw result.error
      }
      return result.status ?? 1
    }),
  }),
]
