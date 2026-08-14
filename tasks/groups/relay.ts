import { def, handler } from '../helpers'
import type { TaskDef } from '../types'

const RELAY_DIR = 'ops/youtube-rtmp-relay'

async function runyarn(
  ctx: { root: string },
  args: string[],
  opts: { clearelectronrunasnode?: boolean } = {},
): Promise<number> {
  const { spawnSync } = await import('node:child_process')
  const path = await import('node:path')
  const cwd = path.join(ctx.root, RELAY_DIR)
  const env = { ...process.env }
  if (opts.clearelectronrunasnode) {
    delete env.ELECTRON_RUN_AS_NODE
  }
  // Windows resolves yarn.cmd only when shell is enabled; bare spawn ENOENTs.
  const result = spawnSync('yarn', args, {
    cwd,
    stdio: 'inherit',
    env,
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
      'Build YouTube relay desktop installers (Electron legacy; migrating to Tauri — ops/docs/local-media-helpers-tauri.mdx)',
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
      return runyarn(ctx, [script], { clearelectronrunasnode: true })
    }),
  }),
  def('relay:build:desktop:mac', {
    description:
      'Build YouTube relay macOS dmg (Electron legacy; Tauri target in src-tauri/)',
    tags: ['deploy'],
    deps: ['relay:build'],
    run: handler(async (ctx) => {
      return runyarn(ctx, ['dist:mac'], { clearelectronrunasnode: true })
    }),
  }),
  def('relay:build:desktop:win', {
    description:
      'Build YouTube relay Windows nsis installer (Electron legacy; Tauri target in src-tauri/)',
    tags: ['deploy'],
    deps: ['relay:build'],
    run: handler(async (ctx) => {
      return runyarn(ctx, ['dist:win'], { clearelectronrunasnode: true })
    }),
  }),
]
