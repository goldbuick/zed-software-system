#!/usr/bin/env node
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
delete process.env.ELECTRON_RUN_AS_NODE

const electronbin = path.join(
  root,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron.cmd' : 'electron',
)

const child = spawn(electronbin, ['.'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
})

function forwardsignal(signal) {
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
