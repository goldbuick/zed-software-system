#!/usr/bin/env node
/**
 * Copy vendor/<platform> binaries into src-tauri/bin for Tauri bundle resources.
 * Run after fetch-binaries and before `tauri build`.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
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
const bindir = path.join(root, 'src-tauri', 'bin')

if (!existsSync(vendordir)) {
  console.error(`missing ${vendordir} -- run yarn fetch-binaries first`)
  process.exit(1)
}

const iswin = process.platform === 'win32'
const ytdlpname = iswin ? 'yt-dlp.exe' : 'yt-dlp'
const ffname = iswin ? 'ffmpeg.exe' : 'ffmpeg'
const denoname = iswin ? 'deno.exe' : 'deno'

rmSync(bindir, { recursive: true, force: true })
mkdirSync(bindir, { recursive: true })

for (const name of [ytdlpname, ffname, denoname]) {
  const src = path.join(vendordir, name)
  if (!existsSync(src)) {
    console.error(`missing ${src}`)
    process.exit(1)
  }
  cpSync(src, path.join(bindir, name), { recursive: false })
}

console.log(`staged ${plat} binaries -> ${bindir}`)
