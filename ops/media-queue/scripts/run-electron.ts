import { execFileSync, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

import { MQ_ROOT, binpath } from './lib/paths'

const root = MQ_ROOT
delete process.env.ELECTRON_RUN_AS_NODE

function resolveelectronbin() {
  if (process.platform === 'darwin') {
    execFileSync(
      binpath('tsx'),
      [path.join(root, 'scripts', 'stage-dev-app.ts')],
      {
        stdio: 'inherit',
        cwd: root,
      },
    )
    const devapp = path.join(
      root,
      'resources',
      'dev',
      'Zed Cafe Media Queue.app',
    )
    const devbin = path.join(devapp, 'Contents', 'MacOS', 'Electron')
    if (existsSync(devbin)) {
      console.log(`media-queue dev: ${devapp}`)
      return devbin
    }
    console.warn(
      'media-queue dev: branded app missing, falling back to stock Electron',
    )
  }
  return ''
}

const electronbin = resolveelectronbin()
if (electronbin) {
  process.env.ELECTRON_EXEC_PATH = electronbin
}

const child = spawn(binpath('electron-vite'), ['dev'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
})

function forwardsignal(signal: NodeJS.Signals) {
  if (!child.killed) {
    try {
      child.kill(signal)
    } catch {
      // ignore
    }
  }
}

process.on('SIGTERM', () => forwardsignal('SIGTERM'))
process.on('SIGINT', () => forwardsignal('SIGINT'))

child.on('exit', (code) => process.exit(code ?? 1))
