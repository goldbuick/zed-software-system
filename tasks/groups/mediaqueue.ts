import { def, handler } from '../helpers'
import type { TaskDef } from '../types'

const MEDIAQUEUE_DIR = 'ops/media-queue'

async function runyarn(
  ctx: { root: string },
  args: string[],
): Promise<number> {
  const { spawnSync } = await import('node:child_process')
  const path = await import('node:path')
  const cwd = path.join(ctx.root, MEDIAQUEUE_DIR)
  const result = spawnSync('yarn', args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  })
  if (result.error) {
    console.error(
      `yarn ${args.join(' ')} failed in ${cwd}: ${result.error.message}`,
    )
    return 1
  }
  return result.status ?? 1
}

export const MEDIAQUEUE_TASKS: TaskDef[] = [
  def('mediaqueue:build', {
    description: 'Install media-queue Tauri helper deps (@tauri-apps/cli)',
    tags: ['deploy'],
    run: handler(async (ctx) => {
      return runyarn(ctx, ['install'])
    }),
  }),
  def('mediaqueue:build:desktop', {
    description:
      'Build media-queue desktop installers (Tauri v2) for current host OS',
    tags: ['deploy'],
    deps: ['mediaqueue:build'],
    run: handler(async (ctx) => {
      const script =
        process.platform === 'darwin'
          ? 'dist:mac'
          : process.platform === 'win32'
            ? 'dist:win'
            : ''
      if (!script) {
        throw new Error(
          'mediaqueue:build:desktop supports macOS and Windows hosts only',
        )
      }
      return runyarn(ctx, [script])
    }),
  }),
  def('mediaqueue:build:desktop:mac', {
    description: 'Build media-queue macOS dmg (Tauri v2)',
    tags: ['deploy'],
    deps: ['mediaqueue:build'],
    run: handler(async (ctx) => {
      return runyarn(ctx, ['dist:mac'])
    }),
  }),
  def('mediaqueue:build:desktop:win', {
    description: 'Build media-queue Windows nsis installer (Tauri v2)',
    tags: ['deploy'],
    deps: ['mediaqueue:build'],
    run: handler(async (ctx) => {
      return runyarn(ctx, ['dist:win'])
    }),
  }),
  def('mediaqueue:dev', {
    description: 'Run media-queue Tauri helper in dev mode',
    tags: ['dev'],
    deps: ['mediaqueue:build'],
    run: handler(async (ctx) => {
      return runyarn(ctx, ['start'])
    }),
  }),
]
