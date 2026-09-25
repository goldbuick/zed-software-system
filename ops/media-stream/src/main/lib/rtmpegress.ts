/**
 * Custom RTMP egress via FFmpeg (YouTube / TikTok / generic).
 * Video: raw BGRA frames on stdin from compositor; audio: AAC from separate pipe or silence.
 */
import { type ChildProcess, spawn } from 'node:child_process'

export type MS_RTMP_JOB = {
  id: string
  process: ChildProcess
}

export type MS_RTMP_START = {
  ffmpeg: string
  rtmpurl: string
  streamkey: string
  width: number
  height: number
  fps: number
  bitratek: number
}

function joinrtmpurl(base: string, key: string): string {
  const trimmed = base.replace(/\/+$/, '')
  const k = key.trim()
  if (!k) {
    return trimmed
  }
  if (trimmed.includes('?')) {
    return `${trimmed}&${k}`
  }
  return `${trimmed}/${k}`
}

export function startrtmpjob(id: string, opts: MS_RTMP_START): MS_RTMP_JOB {
  const dest = joinrtmpurl(opts.rtmpurl, opts.streamkey)
  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'rawvideo',
    '-pix_fmt',
    'rgba',
    '-s',
    `${opts.width}x${opts.height}`,
    '-r',
    String(opts.fps),
    '-i',
    'pipe:0',
    '-f',
    'lavfi',
    '-i',
    'anullsrc=channel_layout=stereo:sample_rate=48000',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-b:v',
    `${opts.bitratek}k`,
    '-maxrate',
    `${opts.bitratek}k`,
    '-bufsize',
    `${opts.bitratek * 2}k`,
    '-pix_fmt',
    'yuv420p',
    '-g',
    String(opts.fps * 2),
    '-c:a',
    'aac',
    '-b:a',
    '160k',
    '-shortest',
    '-f',
    'flv',
    dest,
  ]
  const child = spawn(opts.ffmpeg, args, {
    stdio: ['pipe', 'ignore', 'pipe'],
  })
  return { id, process: child }
}

export function stoprtmpjob(job: MS_RTMP_JOB | undefined): void {
  if (!job) {
    return
  }
  try {
    job.process.stdin?.end()
  } catch {
    // ignore
  }
  try {
    job.process.kill('SIGTERM')
  } catch {
    // ignore
  }
}
