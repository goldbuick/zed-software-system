'use strict'

const path = require('node:path')

function platformdir() {
  if (process.platform === 'darwin') {
    return process.arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64'
  }
  if (process.platform === 'win32') {
    return 'win32-x64'
  }
  return 'linux-x64'
}

function binpath(resourceroot, name) {
  const fs = require('node:fs')
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

function resolveytdlp(resourceroot) {
  const name = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
  return binpath(resourceroot, name)
}

function resolveffmpeg(resourceroot) {
  const name = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  return binpath(resourceroot, name)
}

function resolvedeno(resourceroot) {
  const name = process.platform === 'win32' ? 'deno.exe' : 'deno'
  return binpath(resourceroot, name)
}

function ffmpegdir(ffmpeg) {
  return path.dirname(ffmpeg)
}

module.exports = {
  resolveytdlp,
  resolveffmpeg,
  resolvedeno,
  ffmpegdir,
}
