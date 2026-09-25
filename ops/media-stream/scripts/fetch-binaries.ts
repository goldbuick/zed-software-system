/**
 * Download pinned ffmpeg binary into vendor/<os>-<arch>/.
 * Not committed to git; run before electron build.
 */
import { chmodSync, createWriteStream, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream } from 'node:stream/web'
import { createGunzip } from 'node:zlib'

import { MS_ROOT } from './lib/paths'

type PLATFORM_TARGET = {
  os: string
  arch: string
  key: string
}

function platformtarget(): PLATFORM_TARGET {
  const os = process.platform === 'darwin' ? 'darwin' : process.platform
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
  return { os, arch, key: `${os}-${arch}` }
}

async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok || !res.body) {
    throw new Error(`fetch failed ${res.status} ${url}`)
  }
  const body = Readable.fromWeb(res.body as ReadableStream)
  await pipeline(body, createGunzip(), createWriteStream(dest))
  chmodSync(dest, 0o755)
}

async function fetchffmpeg(outdir: string, plat: PLATFORM_TARGET) {
  const ffmpegname = plat.os === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  const dest = path.join(outdir, ffmpegname)
  if (existsSync(dest)) {
    console.log(`skip existing ${dest}`)
    return
  }
  let asset = ''
  if (plat.os === 'darwin' && plat.arch === 'arm64') {
    asset = 'ffmpeg-darwin-arm64.gz'
  } else if (plat.os === 'darwin') {
    asset = 'ffmpeg-darwin-x64.gz'
  } else if (plat.os === 'win32') {
    asset = 'ffmpeg-win32-x64.gz'
  } else {
    throw new Error(`unsupported os for ffmpeg fetch: ${plat.os}-${plat.arch}`)
  }
  const url = `https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/${asset}`
  console.log(`fetch ${url}`)
  await download(url, dest)
}

async function main() {
  const plat = platformtarget()
  const outdir = path.join(MS_ROOT, 'vendor', plat.key)
  mkdirSync(outdir, { recursive: true })
  await fetchffmpeg(outdir, plat)
  console.log('fetch-binaries done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
