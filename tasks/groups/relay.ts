import { def, handler } from '../helpers'
import type { TaskDef } from '../types'

const RELAY_DIR = 'ops/youtube-rtmp-relay'

async function runyarn(ctx: { root: string }, args: string[]): Promise<number> {
  const { spawnSync } = await import('node:child_process')
  const path = await import('node:path')
  const cwd = path.join(ctx.root, RELAY_DIR)
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

export const RELAY_TASKS: TaskDef[] = [
  def('relay:build', {
    description:
      'Install youtube-rtmp-relay deps and fetch MediaMTX/ffmpeg binaries',
    tags: ['deploy'],
    run: handler(async (ctx) => {
      const install = await runyarn(ctx, ['install'])
      if (install !== 0) {
        return install
      }
      return runyarn(ctx, ['fetch-binaries'])
    }),
  }),
  def('relay:build:desktop', {
    description:
      'Build YouTube relay desktop installers (Electron) for current host OS',
    tags: ['deploy'],
    deps: ['relay:build'],
    run: handler(async (ctx) => {
      const script =
        process.platform === 'darwin'
          ? 'dist:mac'
          : process.platform === 'win32'
            ? 'dist:win'
            : ''
      if (!script) {
        throw new Error(
          'relay:build:desktop supports macOS and Windows hosts only',
        )
      }
      return runyarn(ctx, [script])
    }),
  }),
  def('relay:build:desktop:mac', {
    description: 'Build YouTube relay macOS dmg (Electron)',
    tags: ['deploy'],
    deps: ['relay:build'],
    run: handler(async (ctx) => {
      return runyarn(ctx, ['dist:mac'])
    }),
  }),
  def('relay:build:desktop:win', {
    description: 'Build YouTube relay Windows nsis installer (Electron)',
    tags: ['deploy'],
    deps: ['relay:build'],
    run: handler(async (ctx) => {
      return runyarn(ctx, ['dist:win'])
    }),
  }),
]
