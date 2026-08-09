import { def, handler } from '../helpers'
import type { TaskDef } from '../types'

const RELAY_DIR = 'ops/youtube-rtmp-relay'

export const RELAY_TASKS: TaskDef[] = [
  def('relay:build', {
    description:
      'Install youtube-rtmp-relay deps and fetch MediaMTX/ffmpeg binaries',
    tags: ['deploy'],
    run: handler(async (ctx) => {
      const { spawnSync } = await import('node:child_process')
      const path = await import('node:path')
      const cwd = path.join(ctx.root, RELAY_DIR)
      const install = spawnSync('yarn', ['install'], {
        cwd,
        stdio: 'inherit',
        env: process.env,
      })
      if ((install.status ?? 1) !== 0) {
        return install.status ?? 1
      }
      const fetch = spawnSync('yarn', ['fetch-binaries'], {
        cwd,
        stdio: 'inherit',
        env: process.env,
      })
      return fetch.status ?? 1
    }),
  }),
  def('relay:build:desktop', {
    description: 'Build YouTube relay Electron installers for current host OS',
    tags: ['deploy'],
    deps: ['relay:build'],
    run: handler(async (ctx) => {
      const { spawnSync } = await import('node:child_process')
      const path = await import('node:path')
      const cwd = path.join(ctx.root, RELAY_DIR)
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
      const result = spawnSync('yarn', [script], {
        cwd,
        stdio: 'inherit',
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '' },
      })
      return result.status ?? 1
    }),
  }),
  def('relay:build:desktop:mac', {
    description: 'Build YouTube relay macOS dmg (arm64 + x64)',
    tags: ['deploy'],
    deps: ['relay:build'],
    run: handler(async (ctx) => {
      const { spawnSync } = await import('node:child_process')
      const path = await import('node:path')
      const cwd = path.join(ctx.root, RELAY_DIR)
      const result = spawnSync('yarn', ['dist:mac'], {
        cwd,
        stdio: 'inherit',
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '' },
      })
      return result.status ?? 1
    }),
  }),
  def('relay:build:desktop:win', {
    description: 'Build YouTube relay Windows nsis installer (x64)',
    tags: ['deploy'],
    deps: ['relay:build'],
    run: handler(async (ctx) => {
      const { spawnSync } = await import('node:child_process')
      const path = await import('node:path')
      const cwd = path.join(ctx.root, RELAY_DIR)
      const result = spawnSync('yarn', ['dist:win'], {
        cwd,
        stdio: 'inherit',
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '' },
      })
      return result.status ?? 1
    }),
  }),
]
