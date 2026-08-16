#!/usr/bin/env node
/**
 * Local gate: download a YouTube URL with the same yt-dlp flags as the Tauri helper.
 * Retries until success or --attempts exhausted. Exit 0 only on h264+aac mp4.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const DEFAULT_URL = 'https://www.youtube.com/watch?v=FrLequ6dUdM'
const MAX_ATTEMPTS = Number(process.env.MQ_VERIFY_ATTEMPTS || 4)

function platdir() {
  const os = process.platform === 'darwin' ? 'darwin' : process.platform
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
  return path.join(root, 'vendor', `${os}-${arch}`)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function ffprobe(pathname) {
  try {
    const out = execFileSync(
      'ffprobe',
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
    return out.trim().split('\n')
  } catch (err) {
    return [`ffprobe failed: ${err.message}`]
  }
}

const YOUTUBE_PLAYER_CLIENTS = [
  'default,-android_sdkless',
  'default,-android_vr',
  'tv,web_creator',
  'web,web_creator',
]

function youtubeplayerclient(attempt) {
  const idx = (attempt - 1) % YOUTUBE_PLAYER_CLIENTS.length
  return `youtube:player_client=${YOUTUBE_PLAYER_CLIENTS[idx]}`
}

function warm(ytdlp, deno, ytdlphome, url, attempt) {
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

const YTDLP_FORMAT =
  'best[height<=720][vcodec^=avc][ext=mp4][acodec^=mp4a]/bestvideo[vcodec^=avc1][height<=720][ext=mp4]+bestaudio[acodec^=mp4a][ext=m4a]/bestvideo[vcodec^=avc][height<=720]+bestaudio/best[height<=720]'
const FFMPEG_POST_ARGS_COPY =
  'ffmpeg:-c:v copy -c:a copy -movflags +faststart'
const FFMPEG_POST_ARGS_TRANSCODE =
  'ffmpeg:-c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart'

function download(ytdlp, deno, ffmpegdir, mediadir, ytdlphome, url, attempt) {
  const postargs = attempt === 1 ? FFMPEG_POST_ARGS_COPY : FFMPEG_POST_ARGS_TRANSCODE
  const env = { ...process.env, XDG_CACHE_HOME: ytdlphome }
  const result = spawnSync(
    ytdlp,
    [
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
      '-f',
      YTDLP_FORMAT,
      '--merge-output-format',
      'mp4',
      '--force-overwrites',
      '--postprocessor-args',
      postargs,
      '--no-playlist',
      '--ffmpeg-location',
      ffmpegdir,
      '-o',
      'mq-%(id)s.%(ext)s',
      '--print',
      'after_move:filepath',
      url,
    ],
    { cwd: mediadir, env, encoding: 'utf8' },
  )
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
  const ytdlp = path.join(vend, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp')
  const deno = path.join(vend, process.platform === 'win32' ? 'deno.exe' : 'deno')
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
    const result = download(ytdlp, deno, vend, mediadir, ytdlphome, url, attempt)
    if (!result.ok || !result.outpath || !existsSync(result.outpath)) {
      const err = result.lines.filter((line) => line.includes('ERROR:')).join(' | ')
      console.error(err || 'download failed')
      await sleep(1500)
      continue
    }
    const buf = readFileSync(result.outpath)
    if (buf.length < 12 || buf.toString('ascii', 4, 8) !== 'ftyp') {
      console.error('invalid mp4 container')
      process.exit(1)
    }
    const codecs = ffprobe(result.outpath)
    const size = statSync(result.outpath).size
    console.log(`ok ${result.outpath} (${size} bytes)`)
    console.log(`codecs ${codecs.join(', ')}`)
    if (!codecs.includes('h264,video') || !codecs.includes('aac,audio')) {
      console.error('unexpected codecs (need h264+aac)')
      process.exit(1)
    }
    process.exit(0)
  }
  console.error(`failed after ${MAX_ATTEMPTS} attempts`)
  process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
