#!/usr/bin/env node
/**
 * Build standalone executables for the current platform.
 */
import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

fs.mkdirSync(path.join(root, 'dist-bin'), { recursive: true })

function hostTarget() {
  const platform = os.platform()
  const arch = os.arch()
  if (platform === 'darwin' && arch === 'x64') return 'node22-macos-x64'
  if (platform === 'darwin' && arch === 'arm64') return 'node22-macos-arm64'
  if (platform === 'linux' && arch === 'x64') return 'node22-linux-x64'
  if (platform === 'linux' && arch === 'arm64') return 'node22-linux-arm64'
  if (platform === 'win32' && arch === 'x64') return 'node22-win-x64'
  throw new Error(`Unsupported platform: ${platform}-${arch}`)
}

const target = hostTarget()
const ext = os.platform() === 'win32' ? '.exe' : ''
const outDir = path.join(root, 'dist-bin')
const scripts = [
  { in: 'dist-server/server.js', out: `zss-server${ext}` },
  { in: 'dist-server/simspace.js', out: `zss-simspace${ext}` },
  { in: 'dist-server/heavyspace.js', out: `zss-heavyspace${ext}` },
]

for (const { in: input, out: output } of scripts) {
  const result = spawnSync('pkg', [
    path.join(root, input),
    '-t', target,
    '-o', path.join(outDir, output),
  ], { stdio: 'inherit', cwd: root })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
console.log(`Built ${target} → dist-bin/`)
