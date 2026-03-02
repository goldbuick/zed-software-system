#!/usr/bin/env node
/**
 * Build standalone executables. Usage:
 *   node scripts/pkg-all.mjs        # all platforms
 *   node scripts/pkg-all.mjs linux  # linux only
 *   node scripts/pkg-all.mjs mac    # mac only
 *   node scripts/pkg-all.mjs win    # windows only
 */
import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const filter = process.argv[2]?.toLowerCase()

const targets = [
  { name: 'linux-x64', t: 'node22-linux-x64', ext: '', tag: 'linux' },
  { name: 'macos-x64', t: 'node22-macos-x64', ext: '', tag: 'mac' },
  { name: 'macos-arm64', t: 'node22-macos-arm64', ext: '', tag: 'mac' },
  { name: 'win-x64', t: 'node22-win-x64', ext: '.exe', tag: 'win' },
].filter((t) => !filter || t.tag === filter)

const scripts = ['server.cjs', 'simspace.cjs', 'heavyspace.cjs']
const outNames = ['zss-server', 'zss-simspace', 'zss-heavyspace']

for (const target of targets) {
  const outDir = path.join(root, 'dist-bin', target.name)
  fs.mkdirSync(outDir, { recursive: true })

  for (let i = 0; i < scripts.length; i++) {
    const script = path.join(root, 'dist-server', scripts[i])
    const outFile = path.join(outDir, outNames[i] + target.ext)
    const result = spawnSync(
      'pkg',
      [script, '-t', target.t, '-o', outFile],
      { stdio: 'inherit', cwd: root },
    )
    if (result.status !== 0) {
      process.exit(result.status ?? 1)
    }
  }
}

console.log('Built executables in dist-bin/<platform>/')
