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
const allTargets = [
  { name: 'linux-x64', t: 'node20-linux-x64', ext: '', tag: 'linux' },
  { name: 'macos-x64', t: 'node20-macos-x64', ext: '', tag: 'mac' },
  { name: 'macos-arm64', t: 'node20-macos-arm64', ext: '', tag: 'mac' },
  { name: 'win-x64', t: 'node20-win-x64', ext: '.exe', tag: 'win' },
]

// pkg spawns the target Node binary during fabricate. Building macos-arm64 on Intel
// (or macos-x64 on ARM without Rosetta) triggers EBADEXEC (-86). By default we
// only include macOS targets matching the host. Set PKG_ALLOW_CROSS_ARCH=1 to
// also build the other mac arch (requires Rosetta on Apple Silicon for macos-x64).
const hostArch = process.arch
const hostPlatform = process.platform
const allowCrossArch = process.env.PKG_ALLOW_CROSS_ARCH === '1'
const targets = allTargets
  .filter((t) => !filter || t.tag === filter)
  .filter((t) => {
    if (t.tag === 'mac' && hostPlatform === 'darwin' && !allowCrossArch) {
      const hostIsArm = hostArch === 'arm64'
      const targetIsArm = t.name.includes('arm64')
      if (hostIsArm !== targetIsArm) {
        console.warn(`Skipping ${t.name} (pkg cannot spawn ${targetIsArm ? 'arm64' : 'x64'} Node on ${hostArch}). Set PKG_ALLOW_CROSS_ARCH=1 to try (needs Rosetta on Apple Silicon for x64).`)
        return false
      }
    }
    return true
  })

if (targets.length === 0) {
  console.error('No targets to build. Filter may exclude all compatible targets.')
  process.exit(1)
}

for (const target of targets) {
  const outDir = path.join(root, 'dist-bin-cli', target.name)
  fs.mkdirSync(outDir, { recursive: true })
  const outFile = path.join(outDir, `zss-cli${target.ext}`)

  // For cross-compilation (e.g. Linux→mac/win), need --no-bytecode and --public-packages
  const targetPlatform = target.t.includes('linux') ? 'linux' : target.t.includes('macos') ? 'darwin' : 'win32'
  const isCross = process.platform !== targetPlatform
  const pkgBin = path.join(root, 'node_modules', '@yao-pkg', 'pkg', 'lib-es5', 'bin.js')
  const pkgConfig = path.join(root, 'package.json')
  const args = [
    '-c', pkgConfig,
    cliBundle,
    '-t', target.t,
    '-o', outFile,
  ]
  if (isCross) {
    args.push('--no-bytecode', '--public-packages', '*', '--public')
  }

  const env = { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --no-deprecation`.trim() }
  const result = spawnSync(
    process.execPath,
    [pkgBin, ...args],
    { stdio: 'inherit', cwd: root, env },
  )
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

console.log('Built CLI executables in dist-bin-cli/<platform>/')
