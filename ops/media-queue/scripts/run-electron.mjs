#!/usr/bin/env node
import { execFileSync, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
delete process.env.ELECTRON_RUN_AS_NODE

function resolveelectronbin() {
  if (process.platform === 'darwin') {
    execFileSync('node', [path.join(__dirname, 'stage-dev-app.mjs')], {
      stdio: 'inherit',
      cwd: root,
    })
    const devapp = path.join(root, 'resources', 'dev', 'Zed Cafe Media Queue.app')
    const devbin = path.join(devapp, 'Contents', 'MacOS', 'Electron')
    if (existsSync(devbin)) {
      console.log(`media-queue dev: ${devapp}`)
      return devbin
    }
    console.warn('media-queue dev: branded app missing, falling back to stock Electron')
  }
  return path.join(
    root,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'electron.cmd' : 'electron',
  )
}

const electronbin = resolveelectronbin()

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
