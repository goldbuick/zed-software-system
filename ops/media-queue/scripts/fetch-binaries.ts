/**
 * Download pinned yt-dlp + ffmpeg + deno binaries into vendor/<os>-<arch>/.
 * Not committed to git; run before electron build.
 */
import { execFileSync } from 'node:child_process'
import {
  chmodSync,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
} from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream } from 'node:stream/web'
import { createGunzip } from 'node:zlib'

import { MQ_ROOT } from './lib/paths'

type PLATFORM_TARGET = {
  os: string
  arch: string
  key: string
}

type YTDLP_ASSET = {
  name: string
  urlname: string
}

const root = MQ_ROOT

const YTDLP_VERSION = '2026.08.19'
const DENO_VERSION = 'v2.3.3'

function platformkey(
  os: string = process.platform,
  arch: string = process.arch,
): PLATFORM_TARGET {
  const normos =
    os === 'darwin' ? 'darwin' : os === 'win32' ? 'win32' : String(os)
  const normarch = arch === 'arm64' ? 'arm64' : 'x64'
  return { os: normos, arch: normarch, key: `${normos}-${normarch}` }
}

async function download(url: string, dest: string) {
  console.log(`download ${url}`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`download failed ${res.status}: ${url}`)
  }
  await pipeline(
    Readable.fromWeb(res.body as ReadableStream<Uint8Array>),
    createWriteStream(dest),
  )
}

function ytdlpasset(plat: PLATFORM_TARGET): YTDLP_ASSET {
  if (plat.os === 'darwin') {
    return { name: 'yt-dlp', urlname: 'yt-dlp_macos' }
  }
  if (plat.os === 'win32') {
    return { name: 'yt-dlp.exe', urlname: 'yt-dlp.exe' }
  }
  return { name: 'yt-dlp', urlname: 'yt-dlp' }
}

async function fetchytdlp(outdir: string, plat: PLATFORM_TARGET) {
  const { name, urlname } = ytdlpasset(plat)
  const dest = path.join(outdir, name)
  const url = `https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/${urlname}`
  const archive = path.join(outdir, urlname)
  await download(url, archive)
  if (archive !== dest) {
    const { renameSync } = await import('node:fs')
    renameSync(archive, dest)
  }
  if (plat.os !== 'win32') {
    chmodSync(dest, 0o755)
  }
}

function denoasset(plat: PLATFORM_TARGET) {
  if (plat.os === 'darwin' && plat.arch === 'arm64') {
    return 'deno-aarch64-apple-darwin.zip'
  }
  if (plat.os === 'darwin' && plat.arch === 'x64') {
    return 'deno-x86_64-apple-darwin.zip'
  }
  if (plat.os === 'win32' && plat.arch === 'x64') {
    return 'deno-x86_64-pc-windows-msvc.zip'
  }
  throw new Error(`unsupported platform for deno: ${plat.os}-${plat.arch}`)
}

async function fetchdeno(outdir: string, plat: PLATFORM_TARGET) {
  const binname = plat.os === 'win32' ? 'deno.exe' : 'deno'
  const dest = path.join(outdir, binname)
  const asset = denoasset(plat)
  const url = `https://github.com/denoland/deno/releases/download/${DENO_VERSION}/${asset}`
  const archive = path.join(outdir, asset)
  await download(url, archive)
  if (plat.os === 'win32') {
    execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        `Expand-Archive -Force -Path '${archive.replace(/'/g, "''")}' -DestinationPath '${outdir.replace(/'/g, "''")}'`,
      ],
      { stdio: 'inherit' },
    )
  } else {
    execFileSync('unzip', ['-o', archive, '-d', outdir], { stdio: 'inherit' })
  }
  if (!existsSync(dest)) {
    throw new Error(`deno binary missing after extract: ${dest}`)
  }
  if (plat.os !== 'win32') {
    chmodSync(dest, 0o755)
  }
}

async function fetchffmpeg(outdir: string, plat: PLATFORM_TARGET) {
  const ffmpegname = plat.os === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  const dest = path.join(outdir, ffmpegname)
  if (existsSync(dest)) {
    return
  }

  let asset: string
  if (plat.os === 'darwin' && plat.arch === 'arm64') {
    asset = 'ffmpeg-darwin-arm64.gz'
  } else if (plat.os === 'darwin' && plat.arch === 'x64') {
    asset = 'ffmpeg-darwin-x64.gz'
  } else if (plat.os === 'win32' && plat.arch === 'x64') {
    asset = 'ffmpeg-win32-x64.gz'
  } else {
    throw new Error(`unsupported os for ffmpeg fetch: ${plat.os}-${plat.arch}`)
  }

  const url = `https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/${asset}`
  const archive = path.join(outdir, asset)
  await download(url, archive)
  await pipeline(
    createReadStream(archive),
    createGunzip(),
    createWriteStream(dest),
  )
  if (plat.os !== 'win32') {
    chmodSync(dest, 0o755)
  }
}

async function fetchffprobe(outdir: string, plat: PLATFORM_TARGET) {
  const probename = plat.os === 'win32' ? 'ffprobe.exe' : 'ffprobe'
  const dest = path.join(outdir, probename)
  if (existsSync(dest)) {
    return
  }

  let asset: string
  if (plat.os === 'darwin' && plat.arch === 'arm64') {
    asset = 'ffprobe-darwin-arm64.gz'
  } else if (plat.os === 'darwin' && plat.arch === 'x64') {
    asset = 'ffprobe-darwin-x64.gz'
  } else if (plat.os === 'win32' && plat.arch === 'x64') {
    asset = 'ffprobe-win32-x64.gz'
  } else {
    throw new Error(`unsupported os for ffprobe fetch: ${plat.os}-${plat.arch}`)
  }

  const url = `https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/${asset}`
  const archive = path.join(outdir, asset)
  await download(url, archive)
  await pipeline(
    createReadStream(archive),
    createGunzip(),
    createWriteStream(dest),
  )
  if (plat.os !== 'win32') {
    chmodSync(dest, 0o755)
  }
}

function parsetargets(): PLATFORM_TARGET[] {
  const raw = process.env.MQ_FETCH_TARGETS
  if (raw) {
    return raw.split(',').map((part) => {
      const [os, arch] = part.trim().split('-')
      return platformkey(os, arch)
    })
  }
  if (process.platform === 'darwin') {
    return [platformkey('darwin', 'arm64'), platformkey('darwin', 'x64')]
  }
  if (process.platform === 'win32') {
    return [platformkey('win32', 'x64')]
  }
  return [platformkey()]
}

async function main() {
  const targets = parsetargets()
  for (const plat of targets) {
    const outdir = path.join(root, 'vendor', plat.key)
    mkdirSync(outdir, { recursive: true })
    console.log(`fetch binaries -> ${outdir}`)
    await fetchytdlp(outdir, plat)
    await fetchdeno(outdir, plat)
    await fetchffmpeg(outdir, plat)
    await fetchffprobe(outdir, plat)
  }
  console.log('fetch-binaries done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
