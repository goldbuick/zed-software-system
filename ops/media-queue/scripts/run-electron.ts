import { execFileSync, spawn } from 'node:child_process'
import path from 'node:path'

import { MQ_ROOT, binpath } from './lib/paths'

const root = MQ_ROOT
delete process.env.ELECTRON_RUN_AS_NODE
delete process.env.ELECTRON_EXEC_PATH

if (process.platform === 'darwin') {
  execFileSync(
    binpath('tsx'),
    [path.join(root, 'scripts', 'stage-dev-app.ts')],
    {
      stdio: 'inherit',
      cwd: root,
    },
  )
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
