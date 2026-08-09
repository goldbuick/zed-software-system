#!/usr/bin/env node
/**
 * Download pinned MediaMTX + ffmpeg binaries into vendor/<os>-<arch>/.
 * Not committed to git; run before electron-builder.
 */
import { createWriteStream, existsSync, mkdirSync, chmodSync } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { createGunzip } from 'node:zlib'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Readable } from 'node:stream'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const MEDIAMTX_VERSION = 'v1.12.2'

function platformkey(os = process.platform, arch = process.arch) {
  const normos =
    os === 'darwin' ? 'darwin' : os === 'win32' ? 'win32' : String(os)
  const normarch = arch === 'arm64' ? 'arm64' : 'x64'
  return { os: normos, arch: normarch, key: `${normos}-${normarch}` }
}

function mediamtxasset({ os, arch }) {
  if (os === 'darwin' && arch === 'arm64') {
    return `mediamtx_${MEDIAMTX_VERSION}_darwin_arm64.tar.gz`
  }
  if (os === 'darwin' && arch === 'x64') {
    return `mediamtx_${MEDIAMTX_VERSION}_darwin_amd64.tar.gz`
  }
  if (os === 'win32' && arch === 'x64') {
    return `mediamtx_${MEDIAMTX_VERSION}_windows_amd64.zip`
  }
  throw new Error(`unsupported platform for mediamtx: ${os}-${arch}`)
}

async function download(url, dest) {
  console.log(`download ${url}`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`download failed ${res.status}: ${url}`)
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest))
}

async function fetchmediamtx(outdir, plat) {
  const binname = plat.os === 'win32' ? 'mediamtx.exe' : 'mediamtx'
  const bin = path.join(outdir, binname)
  if (existsSync(bin)) {
    return
  }
  const name = mediamtxasset(plat)
  const url = `https://github.com/bluenviron/mediamtx/releases/download/${MEDIAMTX_VERSION}/${name}`
  const archive = path.join(outdir, name)
  await download(url, archive)
  if (name.endsWith('.zip')) {
    if (process.platform === 'win32') {
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
  } else {
    execFileSync('tar', ['-xzf', archive, '-C', outdir], { stdio: 'inherit' })
  }
  if (plat.os !== 'win32' && existsSync(bin)) {
    chmodSync(bin, 0o755)
  }
}

async function fetchffmpeg(outdir, plat) {
  const ffmpegname = plat.os === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  const dest = path.join(outdir, ffmpegname)
  if (existsSync(dest)) {
    return
  }

  // eugeneware/ffmpeg-static b6.1.1 assets
  let asset
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
  const { createReadStream } = await import('node:fs')
  await pipeline(createReadStream(archive), createGunzip(), createWriteStream(dest))
  if (plat.os !== 'win32') {
    chmodSync(dest, 0o755)
  }
}

function parsetargets() {
  const raw = process.env.RELAY_FETCH_TARGETS
  if (raw) {
    return raw.split(',').map((part) => {
      const [os, arch] = part.trim().split('-')
      return platformkey(os, arch)
    })
  }
  if (process.env.RELAY_TARGET_OS && process.env.RELAY_TARGET_ARCH) {
    return [
      platformkey(process.env.RELAY_TARGET_OS, process.env.RELAY_TARGET_ARCH),
    ]
  }
  // Desktop mac build needs both arches for electron-builder multi-arch.
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
    await fetchmediamtx(outdir, plat)
    await fetchffmpeg(outdir, plat)
  }
  console.log('fetch-binaries done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
