import fs from 'node:fs'
import path from 'node:path'

function platformdir(): string {
  if (process.platform === 'darwin') {
    return process.arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64'
  }
  if (process.platform === 'win32') {
    return 'win32-x64'
  }
  return 'linux-x64'
}

function binpath(resourceroot: string, name: string): string {
  const packagedbin = path.join(resourceroot, 'bin', name)
  if (fs.existsSync(packagedbin)) {
    return packagedbin
  }
  const staged = path.join(resourceroot, 'resources', 'bin', name)
  if (fs.existsSync(staged)) {
    return staged
  }
  return path.join(resourceroot, 'vendor', platformdir(), name)
}

export function resolveytdlp(resourceroot: string): string {
  const name = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
  return binpath(resourceroot, name)
}

export function resolveffmpeg(resourceroot: string): string {
  const name = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  return binpath(resourceroot, name)
}

export function resolvedeno(resourceroot: string): string {
  const name = process.platform === 'win32' ? 'deno.exe' : 'deno'
  return binpath(resourceroot, name)
}

export function ffmpegdir(ffmpeg: string): string {
  return path.dirname(ffmpeg)
}
