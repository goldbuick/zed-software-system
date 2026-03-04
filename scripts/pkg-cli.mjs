#!/usr/bin/env node
/**
 * Build standalone CLI executables. Usage:
 *   node scripts/pkg-cli.mjs        # all platforms
 *   node scripts/pkg-cli.mjs linux  # linux only
 *   node scripts/pkg-cli.mjs mac    # mac only
 *   node scripts/pkg-cli.mjs win    # windows only
 *
 * Prerequisites: yarn build:cli (produces dist-cli/cli.mjs)
 */
import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const cliBundle = path.join(root, 'dist-cli', 'cli.mjs')
if (!fs.existsSync(cliBundle)) {
  console.error('dist-cli/cli.mjs not found. Run: yarn build:cli')
  process.exit(1)
}

const filter = process.argv[2]?.toLowerCase()

// node20 has more prebuilt binaries; node22 may trigger source builds that can fail
const targets = [
  { name: 'linux-x64', t: 'node20-linux-x64', ext: '', tag: 'linux' },
  { name: 'macos-x64', t: 'node20-macos-x64', ext: '', tag: 'mac' },
  { name: 'macos-arm64', t: 'node20-macos-arm64', ext: '', tag: 'mac' },
  { name: 'win-x64', t: 'node20-win-x64', ext: '.exe', tag: 'win' },
].filter((t) => !filter || t.tag === filter)

for (const target of targets) {
  const outDir = path.join(root, 'dist-bin-cli', target.name)
  fs.mkdirSync(outDir, { recursive: true })
  const outFile = path.join(outDir, `zss-cli${target.ext}`)

  // For cross-compilation (e.g. Linux→mac/win), need --no-bytecode and --public-packages
  const targetPlatform = target.t.includes('linux') ? 'linux' : target.t.includes('macos') ? 'darwin' : 'win32'
  const isCross = process.platform !== targetPlatform
  const args = [
    'pkg',
    cliBundle,
    '-t', target.t,
    '-o', outFile,
  ]
  if (isCross) {
    args.push('--no-bytecode', '--public-packages', '*', '--public')
  }

  const result = spawnSync(
    'npx',
    args,
    { stdio: 'inherit', cwd: root },
  )
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

console.log('Built CLI executables in dist-bin-cli/<platform>/')
