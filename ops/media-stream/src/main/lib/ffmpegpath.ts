import fs from 'node:fs'
import path from 'node:path'

import { app } from 'electron'

/** Resolve bundled or PATH ffmpeg for RTMP egress. */
export function resolvefmpegpath(): string {
  const override = String(process.env.MS_FFMPEG || '').trim()
  if (override && fs.existsSync(override)) {
    return override
  }
  const name = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  const candidates = [
    path.join(process.resourcesPath, 'bin', name),
    path.join(app.getAppPath(), 'resources', 'bin', name),
    path.join(app.getAppPath(), 'vendor', platformkey(), name),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }
  return name
}

function platformkey() {
  const os = process.platform === 'darwin' ? 'darwin' : process.platform
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
  return `${os}-${arch}`
}
