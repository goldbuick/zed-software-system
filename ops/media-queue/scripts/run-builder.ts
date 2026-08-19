import { spawn } from 'node:child_process'

import { MQ_ROOT, binpath } from './lib/paths'

const root = MQ_ROOT
delete process.env.ELECTRON_RUN_AS_NODE

const args = process.argv.slice(2)
if (!args.includes('--publish')) {
  args.push('--publish', 'never')
}
const child = spawn(binpath('electron-builder'), args, {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
})
child.on('exit', (code) => process.exit(code ?? 1))
