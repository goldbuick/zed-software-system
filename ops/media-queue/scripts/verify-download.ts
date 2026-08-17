/**
 * Local gate: download a URL with the same yt-dlp flags as the Media Queue helper.
 * Retries until success or --attempts exhausted.
 * Video URLs: exit 0 only on h264+aac mp4.
 * Audio-only URLs (SoundCloud etc.): exit 0 when ffprobe finds an audio stream.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs'
import path from 'node:path'

import {
  FFMPEG_POST_ARGS_AUDIO,
  FFMPEG_POST_ARGS_COPY,
  FFMPEG_POST_ARGS_TRANSCODE,
  YTDLP_AUDIO_FORMAT,
  YTDLP_FORMAT,
  resolveartworkpath,
} from '../src/main/lib/download'

import { MQ_ROOT } from './lib/paths'

type PROBE_RESULT = {
  lines: string[]
  hasVideo: boolean
  hasAudio: boolean
}

type DOWNLOAD_PROFILE = 'video' | 'audio'

type DOWNLOAD_RESULT = {
  ok: boolean
  outpath: string
  lines: string[]
}

const root = MQ_ROOT

const DEFAULT_URL = 'https://www.youtube.com/watch?v=FrLequ6dUdM'
const MAX_ATTEMPTS = Number(process.env.MQ_VERIFY_ATTEMPTS || 4)

function platdir() {
  const os = process.platform === 'darwin' ? 'darwin' : process.platform
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
  return path.join(root, 'vendor', `${os}-${arch}`)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function resolveffprobe(vend: string) {
  const name = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'
  const probe = path.join(vend, name)
  if (existsSync(probe)) {
    return probe
  }
  return 'ffprobe'
}

function probestreams(ffprobe: string, pathname: string): PROBE_RESULT {
  try {
    const out = execFileSync(
      ffprobe,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-show_entries',
        'stream=codec_name,codec_type',
        '-of',
        'csv=p=0',
        pathname,
      ],
      { encoding: 'utf8' },
    )
    const lines = out.trim().split('\n').filter(Boolean)
    const types = lines.map((line) => line.split(',')[1]).filter(Boolean)
    return {
      lines,
      hasVideo: types.includes('video'),
      hasAudio: types.includes('audio'),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      lines: [`ffprobe failed: ${message}`],
      hasVideo: false,
      hasAudio: false,
    }
  }
}

const YOUTUBE_PLAYER_CLIENTS = [
  'default,-android_sdkless',
  'default,-android_vr',
  'tv,web_creator',
  'web,web_creator',
]

function youtubeplayerclient(attempt: number) {
  const idx = (attempt - 1) % YOUTUBE_PLAYER_CLIENTS.length
  return `youtube:player_client=${YOUTUBE_PLAYER_CLIENTS[idx]}`
}

function ytdlpneedsaudiofallback(lines: string[]) {
  const text = lines.join(' ').toLowerCase()
  return (
    text.includes('requested format is not available') ||
    text.includes('no video formats') ||
    text.includes('format is not available')
  )
}

function warm(
  ytdlp: string,
  deno: string,
  ytdlphome: string,
  url: string,
  attempt: number,
) {
  const env = { ...process.env, XDG_CACHE_HOME: ytdlphome }
  spawnSync(
    ytdlp,
    [
      '--no-update',
      '--js-runtimes',
      `deno:${deno}`,
      '--remote-components',
      'ejs:github',
      '--extractor-args',
      youtubeplayerclient(attempt),
      '--skip-download',
      '--print',
      'id',
      url,
    ],
    { env, stdio: 'ignore' },
  )
}

function download(
  ytdlp: string,
  deno: string,
  ffmpegdir: string,
  mediadir: string,
  ytdlphome: string,
  url: string,
  attempt: number,
  profile: DOWNLOAD_PROFILE,
): DOWNLOAD_RESULT {
  const env = { ...process.env, XDG_CACHE_HOME: ytdlphome }
  const args = [
    '--no-update',
    '--js-runtimes',
    `deno:${deno}`,
    '--remote-components',
    'ejs:github',
    '--extractor-args',
    youtubeplayerclient(attempt),
    '--retries',
    '10',
    '--fragment-retries',
    '10',
    ...(attempt > 1 ? ['--sleep-requests', '1'] : []),
  ]
  if (profile === 'audio') {
    args.push(
      '-f',
      YTDLP_AUDIO_FORMAT,
      '--force-overwrites',
      '--postprocessor-args',
      FFMPEG_POST_ARGS_AUDIO,
    )
  } else {
    const postargs =
      attempt === 1 ? FFMPEG_POST_ARGS_COPY : FFMPEG_POST_ARGS_TRANSCODE
    args.push(
      '-f',
      YTDLP_FORMAT,
      '--merge-output-format',
      'mp4',
      '--force-overwrites',
      '--postprocessor-args',
      postargs,
    )
  }
  args.push(
    '--no-playlist',
    '--write-thumbnail',
    '--convert-thumbnails',
    'jpg',
    '--ffmpeg-location',
    ffmpegdir,
    '-o',
    'mq-%(id)s.%(ext)s',
    '--print',
    'after_move:filepath',
    url,
  )
  const result = spawnSync(ytdlp, args, {
    cwd: mediadir,
    env,
    encoding: 'utf8',
  })
  const lines = `${result.stdout || ''}\n${result.stderr || ''}`
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const outpath = [...lines]
    .reverse()
    .find((line) => line.includes('/') && !line.startsWith('['))
  return { ok: result.status === 0, outpath: outpath || '', lines }
}

async function main() {
  const url = process.argv[2] || DEFAULT_URL
  const vend = platdir()
  const ytdlp = path.join(
    vend,
    process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp',
  )
  const deno = path.join(
    vend,
    process.platform === 'win32' ? 'deno.exe' : 'deno',
  )
  const ffprobe = resolveffprobe(vend)
  if (!existsSync(ytdlp) || !existsSync(deno)) {
    console.error('missing vendor binaries -- run yarn fetch-binaries')
    process.exit(1)
  }

  const work = path.join(root, '.verify-download')
  const mediadir = path.join(work, 'media')
  const ytdlphome = path.join(work, 'ytdlp-home')
  rmSync(work, { recursive: true, force: true })
  mkdirSync(mediadir, { recursive: true })
  mkdirSync(ytdlphome, { recursive: true })

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    console.log(`attempt ${attempt}/${MAX_ATTEMPTS}`)
    warm(ytdlp, deno, ytdlphome, url, attempt)
    await sleep(500)
    for (const name of readdirSync(mediadir)) {
      if (name.startsWith('mq-')) {
        rmSync(path.join(mediadir, name), { force: true })
      }
    }
    let result = download(
      ytdlp,
      deno,
      vend,
      mediadir,
      ytdlphome,
      url,
      attempt,
      'video',
    )
    if (!result.ok && ytdlpneedsaudiofallback(result.lines)) {
      console.log('video format unavailable -- trying audio-only')
      for (const name of readdirSync(mediadir)) {
        if (name.startsWith('mq-')) {
          rmSync(path.join(mediadir, name), { force: true })
        }
      }
      result = download(
        ytdlp,
        deno,
        vend,
        mediadir,
        ytdlphome,
        url,
        attempt,
        'audio',
      )
    }
    if (!result.ok || !result.outpath || !existsSync(result.outpath)) {
      const err = result.lines
        .filter((line) => line.includes('ERROR:'))
        .join(' | ')
      console.error(err || 'download failed')
      await sleep(1500)
      continue
    }
    const size = statSync(result.outpath).size
    if (size < 1) {
      console.error('downloaded file is empty')
      await sleep(1500)
      continue
    }
    const probe = probestreams(ffprobe, result.outpath)
    console.log(`ok ${result.outpath} (${size} bytes)`)
    console.log(`codecs ${probe.lines.join(', ')}`)
    if (probe.hasVideo) {
      const buf = readFileSync(result.outpath)
      if (buf.length >= 12 && buf.toString('ascii', 4, 8) !== 'ftyp') {
        console.error('invalid mp4 container')
        process.exit(1)
      }
      if (
        !probe.lines.includes('h264,video') ||
        !probe.lines.includes('aac,audio')
      ) {
        console.error('unexpected codecs (need h264+aac)')
        process.exit(1)
      }
      console.log('mode video')
      process.exit(0)
    }
    if (probe.hasAudio) {
      const artwork = resolveartworkpath(result.outpath)
      if (artwork) {
        console.log(`artwork ${artwork} (${statSync(artwork).size} bytes)`)
      } else {
        console.log('artwork missing')
      }
      console.log('mode audio-only')
      process.exit(0)
    }
    console.error('no audio or video stream found')
    await sleep(1500)
  }
  console.error(`failed after ${MAX_ATTEMPTS} attempts`)
  process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
