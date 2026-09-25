import { def, handler } from '../helpers'
import type { TaskDef } from '../types'

const MEDIASTREAM_DIR = 'ops/media-stream'

async function runyarn(ctx: { root: string }, args: string[]): Promise<number> {
  const { spawnSync } = await import('node:child_process')
  const path = await import('node:path')
  const cwd = path.join(ctx.root, MEDIASTREAM_DIR)
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

export const MEDIASTREAM_TASKS: TaskDef[] = [
  def('mediastream:build', {
    description: 'Install media-stream Electron companion deps',
    tags: ['deploy'],
    run: handler(async (ctx) => {
      return runyarn(ctx, ['install'])
    }),
  }),
  def('mediastream:build:desktop', {
    description:
      'Build media-stream desktop installers (Electron) for current host OS',
    tags: ['deploy'],
    deps: ['mediastream:build'],
    run: handler(async (ctx) => {
      const script =
        process.platform === 'darwin'
          ? 'dist:mac'
          : process.platform === 'win32'
            ? 'dist:win'
            : ''
      if (!script) {
        throw new Error(
          'mediastream:build:desktop supports macOS and Windows hosts only',
        )
      }
      return runyarn(ctx, [script])
    }),
  }),
  def('mediastream:build:desktop:mac', {
    description: 'Build media-stream macOS dmg (Electron)',
    tags: ['deploy'],
    deps: ['mediastream:build'],
    run: handler(async (ctx) => {
      return runyarn(ctx, ['dist:mac'])
    }),
  }),
  def('mediastream:build:desktop:win', {
    description: 'Build media-stream Windows nsis installer (Electron)',
    tags: ['deploy'],
    deps: ['mediastream:build'],
    run: handler(async (ctx) => {
      return runyarn(ctx, ['dist:win'])
    }),
  }),
  def('mediastream:dev', {
    description: 'Run media-stream Electron companion in dev mode',
    tags: ['dev'],
    deps: ['mediastream:build'],
    run: handler(async (ctx) => {
      return runyarn(ctx, ['start'])
    }),
  }),
  def('mediastream:lint', {
    description: 'ESLint + typecheck media-stream Electron companion',
    tags: ['ci'],
    deps: ['mediastream:build'],
    run: handler(async (ctx) => {
      const lint = await runyarn(ctx, ['lint'])
      if (lint !== 0) {
        return lint
      }
      return runyarn(ctx, ['typecheck'])
    }),
  }),
  def('mediastream:test', {
    description: 'Run media-stream sanitize / bus unit checks',
    tags: ['ci'],
    deps: ['mediastream:build'],
    run: handler(async (ctx) => {
      return runyarn(ctx, ['test'])
    }),
  }),
]
