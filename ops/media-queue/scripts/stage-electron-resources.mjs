#!/usr/bin/env node
/**
 * Copy vendor/<platform> binaries into resources/bin for electron-builder extraResources.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function platformkey() {
  const os = process.platform === 'darwin' ? 'darwin' : process.platform
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
  return `${os}-${arch}`
}

const plat = platformkey()
const vendordir = path.join(root, 'vendor', plat)
const bindir = path.join(root, 'resources', 'bin')

if (!existsSync(vendordir)) {
  console.error(`missing ${vendordir} -- run yarn fetch-binaries first`)
  process.exit(1)
}

rmSync(bindir, { recursive: true, force: true })
mkdirSync(bindir, { recursive: true })

for (const name of readdirSync(vendordir)) {
  const src = path.join(vendordir, name)
  cpSync(src, path.join(bindir, name), { recursive: false })
}

console.log(`staged ${plat} binaries -> ${bindir}`)
