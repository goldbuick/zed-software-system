import { execFileSync, spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import type { Readable } from 'node:stream'

import type {
  MQ_DOWNLOAD_STATE,
  MQ_EMIT,
  MQ_ERROR_EVENT,
  MQ_EVENT_NAME,
  MQ_JOB_PHASE,
  MQ_JOB_STATE,
  MQ_PLAYLIST_EXPAND,
  MQ_PROBE_BATCH,
  MQ_PROBE_BATCH_ENTRY,
  MQ_PROBE_META,
  MQ_PROBE_PROGRESS,
} from '../../shared/ipc'
import { MQ_MAX_DURATION_SEC, MQ_PREP_CONCURRENCY } from '../../shared/queue'
import {
  mqismusicyoutubeurl,
  mqparseplaylistflatstdout,
  mqparseprobebatchstdout,
  mqurlwantscookies,
} from '../../shared/urlnormalize'

import { ffmpegdir, resolvedeno, resolveffmpeg, resolveytdlp } from './bins'

type MQ_DOWNLOAD_JOB = {
  url: string
  phase: MQ_JOB_PHASE
  percent: number
  status: string
  detail: string
  filepath: string
  title: string
  error: string
  cancelled: boolean
  activechild: ChildProcess | null
  activethread: Promise<void> | null
  progressevent: MQ_EVENT_NAME
  readyevent: MQ_EVENT_NAME
  errorevent: MQ_EVENT_NAME
}

type MQ_REGISTRY_META = {
  path: string
  title: string
  artist: string
  album: string
  channel: string
  audioOnly: boolean
  artwork: string
}

type MQ_REGISTRY_ENTRY = MQ_REGISTRY_META & {
  state: 'ready'
}

type MQ_READY_PAYLOAD = MQ_REGISTRY_META & {
  duration: number
}

type MQ_MEDIA_PROBE = {
  hasVideo: boolean
  hasAudio: boolean
}

/** Cover / still image streams ffprobe reports as video -- not Chromium-playable A/V. */
const COVER_ART_VIDEO_CODECS = new Set([
  'mjpeg',
  'png',
  'bmp',
  'gif',
  'webp',
  'tiff',
  'rawvideo',
])

const AUDIO_FILE_EXTENSIONS = new Set(['.m4a', '.mp3', '.opus', '.ogg', '.aac'])

type MQ_RESOLVED_BINS = {
  ytdlp: string
  jspath: string
  ffdir: string
  ffprobe: string
}

type MQ_YTDLP_PROFILE = 'video' | 'audio'

export type MQ_YTDLP_FORMAT_TRY = {
  profile: MQ_YTDLP_PROFILE
  format: string
  soundcloudformats: string
  label: string
}

export type MQ_YTDLP_CTX = {
  ytdlp: string
  jspath: string
  ytdlphome: string
  ffdir: string
  cachedir: string
  attempt: number
  cookiesbrowser: string
  url: string
  allowlong?: boolean
}

type MQ_YTDLP_RESULT = {
  success: boolean
  outpath: string
  title: string
  artist: string
  album: string
  channel: string
  message: string
  errlines: string[]
}

type MQ_YTDLP_META = {
  title: string
  artist: string
  album: string
  channel: string
}

type MQ_PRUNE_RESULT = {
  deletedCount: number
}

type MQ_CLEAR_RESULT = {
  deletedCount: number
  freedBytes: number
}

// YouTube reports avc1/mp4a, TikTok reports h264/aac -- both decode as h264+aac.
const VCODEC_H264 = "vcodec~='^(avc|h264)'"
const ACODEC_AAC = "acodec~='^(mp4a|aac)'"
// Portrait sources (TikTok, Shorts) run 576x1024, so a height-only cap rejects
// every video format and silently drops the job onto the audio-only ladder.
// Cap whichever axis is the short side by trying both.
const YTDLP_SIZE_CAPS = ['height<=720', 'width<=720']

function ytdlpformatladder(cap: string): string[] {
  // Prefer DASH video+audio merges over progressive `best` (itag 18). Progressive
  // often selects successfully then 403s on googlevideo, and yt-dlp will not walk
  // the `/` fallbacks after a selected format fails mid-download -- so the whole
  // video try dies and the job silently falls through to audio-only.
  return [
    `bestvideo[${cap}][${VCODEC_H264}][ext=mp4]+bestaudio[${ACODEC_AAC}][ext=m4a]`,
    `bestvideo[${cap}][${VCODEC_H264}]+bestaudio`,
    `best[${cap}][${VCODEC_H264}][ext=mp4][${ACODEC_AAC}]`,
    `best[${cap}]`,
  ]
}

function buildytdlpformat(): string {
  const ladders = YTDLP_SIZE_CAPS.map(ytdlpformatladder)
  const branches: string[] = []
  for (let tier = 0; tier < ladders[0].length; tier += 1) {
    for (let i = 0; i < ladders.length; i += 1) {
      branches.push(ladders[i][tier])
    }
  }
  return branches.join('/')
}

export const YTDLP_FORMAT = buildytdlpformat()
export const YTDLP_AUDIO_FORMAT =
  'bestaudio[ext=m4a]/bestaudio[acodec^=mp4a]/bestaudio'
export const SOUNDCLOUD_FORMATS_AAC =
  'http_aac,hls_aac,http_opus,hls_opus,http_mp3,hls_mp3'
export const SOUNDCLOUD_FORMATS_MP3 = 'http_mp3,hls_mp3'
export const SOUNDCLOUD_FORMATS_OPUS_MP3 = 'http_opus,hls_opus,http_mp3,hls_mp3'
/** Preferred then fallbacks. Later SoundCloud tries omit hls_aac so a 404 there cannot abort extract. */
export const YTDLP_FORMAT_TRIES: readonly MQ_YTDLP_FORMAT_TRY[] = [
  {
    profile: 'video',
    format: YTDLP_FORMAT,
    soundcloudformats: SOUNDCLOUD_FORMATS_AAC,
    label: 'video',
  },
  {
    profile: 'audio',
    format: YTDLP_AUDIO_FORMAT,
    soundcloudformats: SOUNDCLOUD_FORMATS_AAC,
    label: 'audio-aac',
  },
  {
    profile: 'audio',
    format: 'bestaudio[ext=mp3]/bestaudio',
    soundcloudformats: SOUNDCLOUD_FORMATS_MP3,
    label: 'audio-mp3',
  },
  {
    profile: 'audio',
    format: 'bestaudio/best',
    soundcloudformats: SOUNDCLOUD_FORMATS_OPUS_MP3,
    label: 'audio-opus-mp3',
  },
]
export function ytdlpformattriesforurl(
  url: string,
  audioonly = false,
): readonly MQ_YTDLP_FORMAT_TRY[] {
  if (audioonly || mqismusicyoutubeurl(url)) {
    return YTDLP_FORMAT_TRIES.filter((entry) => entry.profile === 'audio')
  }
  return YTDLP_FORMAT_TRIES
}

/**
 * Bits per pixel below which a "video" is really a still image -- album-art
 * tracks, podcast uploads, anything that pairs one frame with audio.
 * Measured: a 1080x1080 art track runs 0.04, a 1920x1080 video runs 2.5.
 */
const MQ_STATIC_FRAME_BITS_PER_PIXEL = 0.15

/** True when the video stream is a still frame, so only the audio is worth fetching. */
export function isstaticframevideo(
  width: number,
  height: number,
  vbrkbps: number,
): boolean {
  const pixels = width * height
  // No video stream at all (audio-only host); the ladder already handles it.
  if (!Number.isFinite(pixels) || pixels <= 0) {
    return false
  }
  if (!Number.isFinite(vbrkbps) || vbrkbps <= 0) {
    return false
  }
  return (vbrkbps * 1000) / pixels < MQ_STATIC_FRAME_BITS_PER_PIXEL
}
const MQ_MEDIA_EXTENSIONS = new Set([
  '.mp4',
  '.m4a',
  '.mp3',
  '.opus',
  '.webm',
  '.aac',
  '.ogg',
])
// Scope to named PPs only -- never use bare `ffmpeg:` / `FFmpeg:`.
// That prefix hits ThumbnailsConvertor too and breaks --convert-thumbnails jpg
// (ERROR: Preprocessing: Conversion failed!).
// yt-dlp --ppa NAME:ARGS allows at most two names (`PP` or `PP+EXE`). Three
// names (Merger+VideoRemuxer+VideoConvertor) fail the parse and apply to every
// post-processor. Split transcode across two --ppa flags.
export const FFMPEG_POST_ARGS_COPY =
  'Merger+VideoRemuxer:-c:v copy -c:a copy -movflags +faststart'
const FFMPEG_TRANSCODE_FLAGS =
  '-c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart'
export const FFMPEG_POST_ARGS_TRANSCODE = [
  `Merger+VideoRemuxer:${FFMPEG_TRANSCODE_FLAGS}`,
  `VideoConvertor:${FFMPEG_TRANSCODE_FLAGS}`,
]
export const FFMPEG_POST_ARGS_AUDIO = 'ExtractAudio+FixupM4a:-c:a aac -b:a 128k'
const YOUTUBE_PLAYER_CLIENTS = [
  // Exclude android_vr: its googlevideo URLs often 403 while still listing
  // formats, which made the video try fail and fall through to audio-only.
  'default,-android_sdkless,-android_vr',
  'tv,web_creator',
  'web,web_creator',
  'mweb',
]
const COOKIE_BROWSERS = [
  'safari',
  'chrome',
  'firefox',
  'brave',
  'edge',
  'chromium',
]

function youtubeplayerclient(attempt: number): string {
  const idx = (attempt - 1) % YOUTUBE_PLAYER_CLIENTS.length
  return `youtube:player_client=${YOUTUBE_PLAYER_CLIENTS[idx]}`
}

export function ismqmediafile(name: string): boolean {
  if (!name.startsWith('mq-')) {
    return false
  }
  const ext = path.extname(name).toLowerCase()
  return MQ_MEDIA_EXTENSIONS.has(ext)
}

const MQ_ARTWORK_EXTENSIONS = new Set(['.jpg', '.jpeg'])

export function ismqartworkfile(name: string): boolean {
  if (!name.startsWith('mq-')) {
    return false
  }
  const ext = path.extname(name).toLowerCase()
  return MQ_ARTWORK_EXTENSIONS.has(ext)
}

/** Resolve yt-dlp sidecar thumbnail next to a downloaded media file. */
export function resolveartworkpath(mediapath: string): string {
  const trimmed = String(mediapath || '').trim()
  if (!trimmed) {
    return ''
  }
  const dir = path.dirname(trimmed)
  const base = path.basename(trimmed, path.extname(trimmed))
  if (!base.startsWith('mq-')) {
    return ''
  }
  const candidates = [
    path.join(dir, `${base}.jpg`),
    path.join(dir, `${base}.jpeg`),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate
    }
  }
  return ''
}

function ispartialfilename(name: string): boolean {
  return (
    name.endsWith('.part') || name.endsWith('.ytdl') || name.endsWith('.temp')
  )
}

function removefilepath(filepath: string): boolean {
  if (!filepath || !fs.existsSync(filepath)) {
    return false
  }
  fs.rmSync(filepath, { force: true })
  return true
}

export function removepartialfiles(
  cachedir: string,
  protectpaths?: string[],
): number {
  let deleted = 0
  if (!fs.existsSync(cachedir)) {
    return deleted
  }
  const protectedset = new Set<string>()
  if (protectpaths) {
    for (const filepath of protectpaths) {
      if (filepath) {
        protectedset.add(path.normalize(filepath))
      }
    }
  }
  for (const name of fs.readdirSync(cachedir)) {
    const filepath = path.join(cachedir, name)
    if (!fs.statSync(filepath).isFile()) {
      continue
    }
    if (protectedset.has(path.normalize(filepath))) {
      continue
    }
    if (ispartialfilename(name)) {
      fs.rmSync(filepath, { force: true })
      deleted += 1
      continue
    }
    if (ismqmediafile(name)) {
      fs.rmSync(filepath, { force: true })
      deleted += 1
    }
  }
  return deleted
}

function removemqmediafiles(
  cachedir: string,
  includepartials: boolean,
): number {
  let deleted = 0
  if (!fs.existsSync(cachedir)) {
    return deleted
  }
  for (const name of fs.readdirSync(cachedir)) {
    const filepath = path.join(cachedir, name)
    if (!fs.statSync(filepath).isFile()) {
      continue
    }
    if (ismqartworkfile(name)) {
      fs.rmSync(filepath, { force: true })
      deleted += 1
      continue
    }
    if (!ismqmediafile(name)) {
      if (!(includepartials && ispartialfilename(name))) {
        continue
      }
    }
    fs.rmSync(filepath, { force: true })
    deleted += 1
  }
  return deleted
}

function mediafilebytes(cachedir: string): number {
  let total = 0
  if (!fs.existsSync(cachedir)) {
    return total
  }
  for (const name of fs.readdirSync(cachedir)) {
    if (!ismqmediafile(name)) {
      continue
    }
    const filepath = path.join(cachedir, name)
    if (!fs.statSync(filepath).isFile()) {
      continue
    }
    total += fs.statSync(filepath).size
  }
  return total
}

function mp4containervalid(filepath: string): boolean {
  const buf = Buffer.alloc(12)
  const fd = fs.openSync(filepath, 'r')
  try {
    const read = fs.readSync(fd, buf, 0, 12, 0)
    if (read < 12) {
      return false
    }
    return buf.toString('ascii', 4, 8) === 'ftyp'
  } finally {
    fs.closeSync(fd)
  }
}

function resolveffprobe(ffmpeg: string): string {
  const dir = path.dirname(ffmpeg)
  const name = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'
  const probe = path.join(dir, name)
  if (fs.existsSync(probe)) {
    return probe
  }
  return 'ffprobe'
}

function probemediafile(ffprobe: string, filepath: string): MQ_MEDIA_PROBE {
  if (!ffprobe || !fs.existsSync(filepath)) {
    return { hasVideo: false, hasAudio: false }
  }
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
        filepath,
      ],
      { encoding: 'utf8' },
    )
    let hasvideo = false
    let hasaudio = false
    const lines = out
      .trim()
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    for (let i = 0; i < lines.length; ++i) {
      const parts = lines[i].split(',')
      const codec = String(parts[0] || '')
        .trim()
        .toLowerCase()
      const kind = String(parts[1] || parts[0] || '')
        .trim()
        .toLowerCase()
      if (kind === 'audio' || codec === 'audio') {
        hasaudio = true
        continue
      }
      if (kind === 'video' || (parts.length === 1 && codec === 'video')) {
        // codec_type-only lines from older probes; treat as real video.
        if (parts.length === 1) {
          hasvideo = true
          continue
        }
        if (!COVER_ART_VIDEO_CODECS.has(codec)) {
          hasvideo = true
        }
      }
    }
    return { hasVideo: hasvideo, hasAudio: hasaudio }
  } catch (_) {
    return { hasVideo: false, hasAudio: false }
  }
}

function mediaisaudioonly(
  filepath: string,
  probe: MQ_MEDIA_PROBE,
  profile: MQ_YTDLP_PROFILE,
): boolean {
  if (!probe.hasAudio) {
    return false
  }
  if (profile === 'audio') {
    return true
  }
  const ext = path.extname(filepath).toLowerCase()
  if (AUDIO_FILE_EXTENSIONS.has(ext)) {
    return true
  }
  return !probe.hasVideo
}

function validatemediafile(filepath: string, probe: MQ_MEDIA_PROBE): boolean {
  if (!fs.existsSync(filepath)) {
    return false
  }
  if (fs.statSync(filepath).size < 1) {
    return false
  }
  if (probe.hasVideo && path.extname(filepath).toLowerCase() === '.mp4') {
    return mp4containervalid(filepath)
  }
  return probe.hasAudio
}

function parsepercent(line: string): number | null {
  const idx = line.indexOf('%')
  if (idx < 0) {
    return null
  }
  const before = line.slice(0, idx)
  const parts = before.trim().split(/\s+/)
  const token = parts[parts.length - 1]
  const pct = Number(token)
  return Number.isFinite(pct) ? pct : null
}

function parseeta(line: string): string {
  const pos = line.indexOf('ETA ')
  if (pos < 0) {
    return ''
  }
  return line.slice(pos + 4).trim()
}

function ytdlpprogressstatus(line: string): string {
  if (line.includes('[download]')) {
    return 'downloading'
  }
  if (
    line.includes('ffmpeg') ||
    line.includes('Merger') ||
    line.includes('ExtractAudio') ||
    line.includes('Post-process')
  ) {
    return 'processing'
  }
  return 'downloading'
}

function ytdlplogphase(line: string): string | null {
  const lower = line.toLowerCase()
  if (
    lower.includes('extracting url') ||
    lower.includes('extracting cookies') ||
    lower.includes('downloading webpage') ||
    lower.includes('downloading tv') ||
    lower.includes('downloading player') ||
    lower.includes('downloading ios') ||
    lower.includes('downloading android') ||
    lower.includes('downloading m3u8') ||
    lower.includes('downloading api') ||
    lower.includes('downloading signature') ||
    lower.includes('downloading initial') ||
    lower.includes('[info]')
  ) {
    return 'extracting'
  }
  if (
    lower.includes('merger') ||
    lower.includes('ffmpeg') ||
    lower.includes('extractaudio') ||
    lower.includes('post-process') ||
    lower.includes('videoconvertor') ||
    lower.includes('converting video')
  ) {
    return 'processing'
  }
  return null
}

function ytdlplogdetail(line: string): string {
  const trimmed = line.trim()
  const idx = trimmed.lastIndexOf(':')
  if (idx >= 0) {
    const tail = trimmed.slice(idx + 1).trim()
    if (tail) {
      return tail.slice(0, 56)
    }
  }
  return trimmed.slice(0, 56)
}

function formatytdlperror(errlines: string[], code: number | null): string {
  const joined = errlines.join('\n').toLowerCase()
  if (
    joined.includes('match filter') ||
    joined.includes('does not pass filter') ||
    (joined.includes('skipping') && joined.includes('duration'))
  ) {
    const mins = Math.round(MQ_MAX_DURATION_SEC / 60)
    return (
      'media duration unknown or longer than ' + mins + ' minutes (rejected)'
    )
  }
  const picked = errlines.filter((line) => {
    if (line.includes('WARNING: --paths is ignored')) {
      return false
    }
    const lower = line.toLowerCase()
    return (
      line.includes('ERROR:') ||
      line.includes('WARNING:') ||
      lower.includes('[jsc') ||
      lower.includes('ejs') ||
      lower.includes('deno') ||
      lower.includes('403')
    )
  })
  if (!picked.length) {
    const last = [...errlines].reverse().find((line) => line.trim())
    if (last) {
      picked.push(last)
    }
  }
  if (!picked.length) {
    return `yt-dlp exited with status ${code ?? -1}`
  }
  return picked.join(' | ')
}

function captureytdlpoutpath(current: string, line: string): string {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('[')) {
    return current
  }
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    return trimmed
  }
  return current
}

function ytdlpmetafield(raw: string): string {
  const trimmed = String(raw || '').trim()
  if (!trimmed || trimmed === 'NA' || trimmed === 'None') {
    return ''
  }
  return trimmed.slice(0, 120)
}

/** Parse yt-dlp TSV: title \\t artist \\t album \\t channel \\t uploader */
function captureytdlpmeta(current: MQ_YTDLP_META, line: string): MQ_YTDLP_META {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('[')) {
    return current
  }
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    return current
  }
  if (trimmed.indexOf('\t') < 0) {
    // Legacy single-field title print (or unexpected line).
    if (!current.title) {
      return {
        title: ytdlpmetafield(trimmed),
        artist: current.artist,
        album: current.album,
        channel: current.channel,
      }
    }
    return current
  }
  const parts = trimmed.split('\t')
  const title = ytdlpmetafield(parts[0] ?? '')
  const artist = ytdlpmetafield(parts[1] ?? '')
  const album = ytdlpmetafield(parts[2] ?? '')
  const channel = ytdlpmetafield(parts[3] ?? '')
  const uploader = ytdlpmetafield(parts[4] ?? '')
  return {
    title: title || current.title,
    artist: artist || current.artist,
    album: album || current.album,
    channel: channel || uploader || current.channel,
  }
}

function applyytdlpbaseargs(
  args: string[],
  jspath: string,
  _ytdlphome: string,
  attempt: number,
  soundcloudformats: string,
): void {
  args.push(
    '--no-update',
    '--js-runtimes',
    jspath,
    '--remote-components',
    'ejs:github',
    '--extractor-args',
    youtubeplayerclient(attempt),
    '--extractor-args',
    `soundcloud:formats=${soundcloudformats}`,
  )
}

function applyytdlpdownloadargs(
  args: string[],
  attempt: number,
  allowlong: boolean,
): void {
  args.push('--retries', '10', '--fragment-retries', '10')
  if (!allowlong) {
    args.push('--match-filter', 'duration <= ' + MQ_MAX_DURATION_SEC)
  }
  if (attempt > 1) {
    args.push('--sleep-requests', '1')
  }
}

function applyytdlpcookies(args: string[], browser: string, url: string): void {
  if (browser && mqurlwantscookies(url)) {
    args.push('--cookies-from-browser', browser)
  }
}

function pushpostprocessorargs(
  args: string[],
  ppas: string | readonly string[],
) {
  const list = typeof ppas === 'string' ? [ppas] : ppas
  for (let i = 0; i < list.length; i += 1) {
    args.push('--postprocessor-args', list[i])
  }
}

export function buildytdlpargs(
  ctx: MQ_YTDLP_CTX,
  formattry: MQ_YTDLP_FORMAT_TRY,
): string[] {
  const args: string[] = []
  applyytdlpbaseargs(
    args,
    ctx.jspath,
    ctx.ytdlphome,
    ctx.attempt,
    formattry.soundcloudformats,
  )
  applyytdlpdownloadargs(args, ctx.attempt, ctx.allowlong === true)
  applyytdlpcookies(args, ctx.cookiesbrowser, ctx.url)
  if (formattry.profile === 'audio') {
    args.push('-f', formattry.format, '--force-overwrites')
    pushpostprocessorargs(args, FFMPEG_POST_ARGS_AUDIO)
  } else {
    args.push(
      '-f',
      formattry.format,
      '--merge-output-format',
      'mp4',
      '--force-overwrites',
    )
    pushpostprocessorargs(
      args,
      ctx.attempt === 1 ? FFMPEG_POST_ARGS_COPY : FFMPEG_POST_ARGS_TRANSCODE,
    )
  }
  args.push(
    '--no-playlist',
    '--progress',
    '--newline',
    '--write-thumbnail',
    '--convert-thumbnails',
    'jpg',
    '--ffmpeg-location',
    ctx.ffdir,
    '-o',
    'mq-%(id)s.%(ext)s',
    '--print',
    '%(title)s\t%(artist)s\t%(album)s\t%(channel)s\t%(uploader)s',
    '--print',
    'after_move:filepath',
    ctx.url,
  )
  return args
}

const MQ_PROBE_TIMEOUT_MS = 45_000
const MQ_PROBE_ERROR_MAX = 90

function probefailure(error: string): MQ_PROBE_META {
  return {
    title: '',
    durationsec: 0,
    failed: true,
    error,
    audioonly: false,
  }
}

/**
 * One-line reason from yt-dlp stderr for the tape. Drops the
 * `ERROR: [extractor] id:` prefix and the report-this-issue tail, and rewrites
 * yt-dlp's generic "This video" -- it says that for SoundCloud audio too.
 */
export function probeerrormessage(stderr: string, code: number | null): string {
  const lines = String(stderr || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const picked = lines.find((line) => line.includes('ERROR:')) ?? lines.pop()
  if (!picked) {
    return `probe failed with status ${code ?? -1}`
  }
  const text =
    picked
      .replace(/^ERROR:\s*/, '')
      .replace(/^\[[^\]]+\]\s*/, '')
      .replace(/^[\w-]+:\s*/, '')
      .replace(/;\s*please report this issue.*$/i, '')
      .replace(/^this video\b/i, 'this track')
      .trim() || picked
  if (text.length <= MQ_PROBE_ERROR_MAX) {
    return text
  }
  return `${text.slice(0, MQ_PROBE_ERROR_MAX - 3)}...`
}

export function buildytdlpprobeargs(ctx: MQ_YTDLP_CTX): string[] {
  const args: string[] = []
  applyytdlpbaseargs(
    args,
    ctx.jspath,
    ctx.ytdlphome,
    ctx.attempt,
    SOUNDCLOUD_FORMATS_AAC,
  )
  applyytdlpcookies(args, ctx.cookiesbrowser, ctx.url)
  args.push(
    '--no-playlist',
    '--skip-download',
    '--print',
    'title',
    '--print',
    'duration',
    '--print',
    'width',
    '--print',
    'height',
    '--print',
    'vbr',
    ctx.url,
  )
  return args
}

const MQ_PROBE_BATCH_BASE_MS = 30_000
const MQ_PROBE_BATCH_PER_ENTRY_MS = 6_000
const MQ_PROBE_BATCH_MAX_MS = 180_000

function probebatchentries(stdout: string): MQ_PROBE_BATCH_ENTRY[] {
  return mqparseprobebatchstdout(stdout).map((line) => ({
    id: line.id,
    url: line.url,
    title: line.title,
    durationsec: line.durationsec,
    audioonly: isstaticframevideo(line.width, line.height, line.vbrkbps),
  }))
}

/** Ceiling for the batch metadata pass; scales with how many entries it reads. */
export function probebatchtimeoutms(count: number): number {
  const scaled =
    MQ_PROBE_BATCH_BASE_MS + Math.max(count, 1) * MQ_PROBE_BATCH_PER_ENTRY_MS
  return Math.min(scaled, MQ_PROBE_BATCH_MAX_MS)
}

/**
 * Metadata for the first `count` playlist entries in one pass:
 * webpage_url, title, duration (tab-separated).
 *
 * One yt-dlp run reads a whole set roughly ten times faster than one run per
 * track, and avoids the per-host throttling that made parallel single probes
 * blow through MQ_PROBE_TIMEOUT_MS. `--ignore-errors` keeps the run going past
 * entries that fail, so the playable ones still report.
 */
export function buildytdlpprobebatchargs(
  ctx: MQ_YTDLP_CTX,
  count: number,
): string[] {
  const args: string[] = []
  applyytdlpbaseargs(
    args,
    ctx.jspath,
    ctx.ytdlphome,
    ctx.attempt,
    SOUNDCLOUD_FORMATS_AAC,
  )
  applyytdlpcookies(args, ctx.cookiesbrowser, ctx.url)
  args.push(
    '--ignore-errors',
    '--yes-playlist',
    '-I',
    `1:${Math.max(count, 1)}`,
    '--skip-download',
    '--print',
    '%(id)s\t%(webpage_url)s\t%(title)s\t%(duration)s\t%(width)s\t%(height)s\t%(vbr)s',
    ctx.url,
  )
  return args
}

const MQ_PLAYLIST_EXPAND_TIMEOUT_MS = 90_000

/** Flat playlist listing: webpage_url, url, id, title, duration (tab-separated). */
export function buildytdlpplaylistargs(ctx: MQ_YTDLP_CTX): string[] {
  const args: string[] = []
  applyytdlpbaseargs(
    args,
    ctx.jspath,
    ctx.ytdlphome,
    ctx.attempt,
    SOUNDCLOUD_FORMATS_AAC,
  )
  applyytdlpcookies(args, ctx.cookiesbrowser, ctx.url)
  args.push(
    '--flat-playlist',
    '--skip-download',
    '--print',
    '%(webpage_url)s\t%(url)s\t%(id)s\t%(title)s\t%(duration)s',
    ctx.url,
  )
  return args
}

async function runytdlpdownload(
  job: MQ_DOWNLOAD_JOB,
  emit: MQ_EMIT,
  ctx: MQ_YTDLP_CTX,
  formattry: MQ_YTDLP_FORMAT_TRY,
): Promise<MQ_YTDLP_RESULT> {
  const args = buildytdlpargs(ctx, formattry)
  const child = spawn(ctx.ytdlp, args, {
    cwd: ctx.cachedir,
    env: { ...process.env, XDG_CACHE_HOME: ctx.ytdlphome },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  job.activechild = child

  let outpath = ''
  let meta: MQ_YTDLP_META = {
    title: '',
    artist: '',
    album: '',
    channel: '',
  }
  const errlines: string[] = []

  const stdoutdone = readstreamlines(child.stdout, (line) => {
    if (job.cancelled) {
      return
    }
    emitline(job, emit, line)
    meta = captureytdlpmeta(meta, line)
    outpath = captureytdlpoutpath(outpath, line)
  })
  const stderrdone = readstreamlines(child.stderr, (line) => {
    if (job.cancelled) {
      return
    }
    emitline(job, emit, line)
    if (line.trim()) {
      errlines.push(line)
    }
  })

  const code = await new Promise<number | null>((resolve) => {
    child.on('close', resolve)
  })
  await Promise.all([stdoutdone, stderrdone])
  job.activechild = null

  const message = errlines.length
    ? formatytdlperror(errlines, code)
    : `yt-dlp exited with status ${code ?? -1}`

  return {
    success: code === 0,
    outpath,
    title: meta.title,
    artist: meta.artist,
    album: meta.album,
    channel: meta.channel,
    message,
    errlines,
  }
}

function emitline(job: MQ_DOWNLOAD_JOB, emit: MQ_EMIT, line: string): void {
  if (!line) {
    return
  }
  const progressevent = job.progressevent || 'mq-download-progress'
  if (line.includes('%')) {
    const pct = parsepercent(line)
    if (pct === null) {
      return
    }
    const status = ytdlpprogressstatus(line)
    const eta = parseeta(line)
    job.percent = pct
    job.status = status
    job.detail = eta
    emit(progressevent, {
      percent: pct,
      eta: eta,
      status: status,
    })
    return
  }
  const phase = ytdlplogphase(line)
  if (!phase) {
    return
  }
  const detail = ytdlplogdetail(line)
  job.status = phase
  job.detail = detail
  emit(progressevent, {
    percent: job.percent,
    eta: detail,
    status: phase,
  })
}

function readstreamlines(
  stream: Readable,
  online: (line: string) => void,
): Promise<void> {
  return new Promise<void>((resolve) => {
    const rl = readline.createInterface({ input: stream })
    rl.on('line', online)
    rl.on('close', resolve)
  })
}

const PREP_RETRY_DELAYS_MS = [5000, 15000, 45000]

function createjob(): MQ_DOWNLOAD_JOB {
  return {
    url: '',
    phase: 'idle',
    percent: 0,
    status: 'idle',
    detail: '',
    filepath: '',
    title: '',
    error: '',
    cancelled: false,
    activechild: null,
    activethread: null,
    progressevent: 'mq-download-progress',
    readyevent: 'mq-download-ready',
    errorevent: 'mq-download-error',
  }
}

function resetjob(job: MQ_DOWNLOAD_JOB): void {
  job.phase = 'idle'
  job.percent = 0
  job.status = 'idle'
  job.detail = ''
  job.filepath = ''
  job.title = ''
  job.error = ''
  job.cancelled = false
  job.activechild = null
}

function readjobstate(job: MQ_DOWNLOAD_JOB): MQ_JOB_STATE {
  return {
    url: job.url,
    phase: job.phase,
    percent: job.percent,
    status: job.status,
    detail: job.detail,
    path: job.filepath,
    error: job.error,
  }
}

function idleprepstate(url = ''): MQ_JOB_STATE {
  return {
    url,
    phase: 'idle',
    percent: 0,
    status: 'idle',
    detail: '',
    path: '',
    error: '',
  }
}

export class DownloadManager {
  resourceroot: string
  cachedir: string
  ytdlphome: string
  cookiesbrowser: string
  playback: MQ_DOWNLOAD_JOB
  /** Concurrent background prep downloads keyed by URL. */
  prepjobs: Map<string, MQ_DOWNLOAD_JOB>
  registry: Map<string, MQ_REGISTRY_ENTRY>
  /** Active decode path; survives job reset so removepartialfiles cannot wipe mid-load. */
  playingpath: string
  playingartwork: string
  prepretrytimer: NodeJS.Timeout | null
  prepretryattempt: number
  prepemit: MQ_EMIT | null
  prepallowlong: boolean
  prepaudioonly: boolean

  constructor(resourceroot: string, cachedir: string) {
    this.resourceroot = resourceroot
    this.cachedir = cachedir
    this.ytdlphome = path.join(cachedir, 'ytdlp-home')
    this.cookiesbrowser = ''
    this.playback = createjob()
    this.prepjobs = new Map()
    this.registry = new Map()
    this.playingpath = ''
    this.playingartwork = ''
    this.prepretrytimer = null
    this.prepretryattempt = 0
    this.prepemit = null
    this.prepallowlong = false
    this.prepaudioonly = false
    fs.mkdirSync(cachedir, { recursive: true })
    fs.mkdirSync(this.ytdlphome, { recursive: true })
  }

  claimplayingmedia(filepath: string, artwork?: string): void {
    const media = String(filepath || '').trim()
    this.playingpath = media
    const art = String(artwork || '').trim()
    this.playingartwork = art || (media ? resolveartworkpath(media) : '')
  }

  clearplayingmedia(): void {
    this.playingpath = ''
    this.playingartwork = ''
  }

  setcookiesbrowser(browser: string): void {
    const trimmed = String(browser || '')
      .trim()
      .toLowerCase()
    if (!trimmed || COOKIE_BROWSERS.includes(trimmed)) {
      this.cookiesbrowser = trimmed
    } else {
      this.cookiesbrowser = ''
    }
  }

  readcookiesbrowser(): string {
    return this.cookiesbrowser
  }

  readstate(): MQ_DOWNLOAD_STATE {
    return {
      phase: this.playback.phase,
      percent: this.playback.percent,
      status: this.playback.status,
      detail: this.playback.detail,
      path: this.playback.filepath,
      error: this.playback.error,
      cacheBytes: mediafilebytes(this.cachedir),
    }
  }

  readprepstate(): MQ_JOB_STATE {
    for (const job of this.prepjobs.values()) {
      if (job.phase === 'downloading') {
        return readjobstate(job)
      }
    }
    for (const [url, job] of this.prepjobs) {
      const entry = this.registry.get(url)
      if (entry && entry.state === 'ready') {
        return {
          url,
          phase: 'ready',
          percent: 100,
          status: 'ready',
          detail: '',
          path: entry.path,
          error: '',
        }
      }
      if (job.phase === 'ready') {
        return readjobstate(job)
      }
    }
    return idleprepstate()
  }

  listprepstates(): MQ_JOB_STATE[] {
    const out: MQ_JOB_STATE[] = []
    for (const [url, job] of this.prepjobs) {
      const entry = this.registry.get(url)
      if (entry && entry.state === 'ready') {
        out.push({
          url,
          phase: 'ready',
          percent: 100,
          status: 'ready',
          detail: '',
          path: entry.path,
          error: '',
        })
        continue
      }
      out.push(readjobstate(job))
    }
    return out
  }

  countprepdownloading(): number {
    let count = 0
    for (const job of this.prepjobs.values()) {
      if (job.phase === 'downloading') {
        count += 1
      }
    }
    return count
  }

  protectedpaths(): string[] {
    const paths: string[] = []
    for (const entry of this.registry.values()) {
      if (entry.path) {
        paths.push(entry.path)
      }
      if (entry.artwork) {
        paths.push(entry.artwork)
      }
    }
    if (this.playingpath) {
      paths.push(this.playingpath)
    }
    if (this.playingartwork) {
      paths.push(this.playingartwork)
    }
    if (this.playback.filepath) {
      paths.push(this.playback.filepath)
      const playbackart = resolveartworkpath(this.playback.filepath)
      if (playbackart) {
        paths.push(playbackart)
      }
    }
    for (const job of this.prepjobs.values()) {
      if (job.filepath) {
        paths.push(job.filepath)
        const prepart = resolveartworkpath(job.filepath)
        if (prepart) {
          paths.push(prepart)
        }
      }
    }
    return paths
  }

  setregistryready(url: string, meta: MQ_REGISTRY_META): void {
    this.registry.set(url, {
      path: meta.path,
      title: meta.title,
      artist: meta.artist || '',
      album: meta.album || '',
      channel: meta.channel || '',
      audioOnly: meta.audioOnly,
      artwork: meta.artwork || '',
      state: 'ready',
    })
  }

  readregistryready(url: string): MQ_REGISTRY_ENTRY | null {
    const trimmed = String(url || '').trim()
    if (!trimmed) {
      return null
    }
    const entry = this.registry.get(trimmed)
    if (!entry || entry.state !== 'ready' || !entry.path) {
      return null
    }
    if (!fs.existsSync(entry.path)) {
      if (entry.artwork) {
        removefilepath(entry.artwork)
      }
      this.registry.delete(trimmed)
      return null
    }
    return entry
  }

  takeprepready(url: string): MQ_READY_PAYLOAD | null {
    const trimmed = String(url || '').trim()
    if (!trimmed) {
      return null
    }
    const entry = this.readregistryready(trimmed)
    if (!entry) {
      return null
    }
    // Claim playing path so cancelprep / download retries cannot
    // removepartialfiles the file while the renderer is still opening it.
    // Keep the registry row so a duplicate short-form queue slot can reuse
    // the same download; prunequeuecache drops it when the URL leaves the queue.
    this.claimplayingmedia(entry.path, entry.artwork)
    const prepjob = this.prepjobs.get(trimmed)
    if (prepjob) {
      resetjob(prepjob)
      this.prepjobs.delete(trimmed)
    }
    return {
      path: entry.path,
      title: entry.title,
      artist: entry.artist || '',
      album: entry.album || '',
      channel: entry.channel || '',
      audioOnly: entry.audioOnly,
      artwork: entry.artwork || '',
      duration: 0,
    }
  }

  prunequeuecache(keepurls: string[], playingurl: string): MQ_PRUNE_RESULT {
    const keep = new Set<string>()
    if (Array.isArray(keepurls)) {
      for (const raw of keepurls) {
        const trimmed = String(raw || '').trim()
        if (trimmed) {
          keep.add(trimmed)
        }
      }
    }
    const playing = String(playingurl || '').trim()
    if (playing) {
      keep.add(playing)
    }
    let deleted = 0
    for (const [url, entry] of this.registry.entries()) {
      if (keep.has(url)) {
        continue
      }
      if (entry.path) {
        if (removefilepath(entry.path)) {
          deleted += 1
        }
      }
      if (entry.artwork) {
        if (removefilepath(entry.artwork)) {
          deleted += 1
        }
      }
      this.registry.delete(url)
    }
    return { deletedCount: deleted }
  }

  clearprepretry(): void {
    if (this.prepretrytimer) {
      clearTimeout(this.prepretrytimer)
      this.prepretrytimer = null
    }
    this.prepretryattempt = 0
  }

  scheduleprepretry(url: string, emit: MQ_EMIT): void {
    this.clearprepretry()
    const delay =
      PREP_RETRY_DELAYS_MS[
        Math.min(this.prepretryattempt, PREP_RETRY_DELAYS_MS.length - 1)
      ]
    this.prepretryattempt += 1
    this.prepretrytimer = setTimeout(() => {
      this.prepretrytimer = null
      const job = this.prepjobs.get(url)
      if (job && job.phase === 'ready') {
        return
      }
      if (this.readregistryready(url)) {
        return
      }
      void this.startprep(url, emit, this.prepallowlong, this.prepaudioonly)
    }, delay)
  }

  warmejscache(): void {
    const ytdlp = resolveytdlp(this.resourceroot)
    const deno = resolvedeno(this.resourceroot)
    if (!fs.existsSync(ytdlp) || !fs.existsSync(deno)) {
      return
    }
    const denopath = fs.realpathSync(deno)
    const args: string[] = []
    applyytdlpbaseargs(
      args,
      `deno:${denopath}`,
      this.ytdlphome,
      1,
      SOUNDCLOUD_FORMATS_AAC,
    )
    args.push(
      '--skip-download',
      '--print',
      'id',
      'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    )
    spawn(ytdlp, args, {
      env: { ...process.env, XDG_CACHE_HOME: this.ytdlphome },
      stdio: 'ignore',
    })
  }

  canceljob(job: MQ_DOWNLOAD_JOB): void {
    job.cancelled = true
    if (job.activechild) {
      try {
        job.activechild.kill()
      } catch (_) {}
      job.activechild = null
    }
  }

  canceljobpartials(job: MQ_DOWNLOAD_JOB): void {
    removepartialfiles(this.cachedir, this.protectedpaths())
    if (job.phase === 'downloading') {
      resetjob(job)
    } else {
      job.cancelled = false
    }
  }

  canceldownload(): void {
    this.canceljob(this.playback)
    this.canceljobpartials(this.playback)
    this.playback.url = ''
  }

  cancelprep(): void {
    this.clearprepretry()
    this.prepemit = null
    for (const job of this.prepjobs.values()) {
      this.canceljob(job)
      if (job.phase === 'downloading') {
        resetjob(job)
      } else {
        job.cancelled = false
      }
    }
    this.prepjobs.clear()
    removepartialfiles(this.cachedir, this.protectedpaths())
  }

  cleardownloads(): MQ_CLEAR_RESULT {
    this.canceldownload()
    this.cancelprep()
    this.registry.clear()
    this.clearplayingmedia()
    this.playback.filepath = ''
    this.playback.error = ''
    const before = mediafilebytes(this.cachedir)
    const deleted = removemqmediafiles(this.cachedir, false)
    fs.mkdirSync(this.cachedir, { recursive: true })
    fs.mkdirSync(this.ytdlphome, { recursive: true })
    const after = mediafilebytes(this.cachedir)
    return {
      deletedCount: deleted,
      freedBytes: before > after ? before - after : 0,
    }
  }

  resolvebinaries(): MQ_RESOLVED_BINS {
    const ytdlp = resolveytdlp(this.resourceroot)
    const ffmpeg = resolveffmpeg(this.resourceroot)
    const deno = resolvedeno(this.resourceroot)
    if (!fs.existsSync(ytdlp)) {
      throw new Error(
        `yt-dlp binary missing: ${ytdlp}. Run yarn fetch-binaries in ops/media-queue.`,
      )
    }
    if (!fs.existsSync(ffmpeg)) {
      throw new Error(
        `ffmpeg binary missing: ${ffmpeg}. Run yarn fetch-binaries in ops/media-queue.`,
      )
    }
    if (!fs.existsSync(deno)) {
      throw new Error(
        `deno binary missing: ${deno}. Run yarn fetch-binaries in ops/media-queue.`,
      )
    }
    const denopath = fs.realpathSync(deno)
    return {
      ytdlp,
      jspath: `deno:${denopath}`,
      ffdir: ffmpegdir(ffmpeg),
      ffprobe: resolveffprobe(ffmpeg),
    }
  }

  async runjobdownload(
    job: MQ_DOWNLOAD_JOB,
    url: string,
    emit: MQ_EMIT,
    allowlong = false,
    audioonly = false,
  ): Promise<MQ_READY_PAYLOAD | null> {
    const trimmed = String(url || '').trim()
    if (!trimmed) {
      throw new Error('url required')
    }

    job.url = trimmed
    job.error = ''
    job.filepath = ''
    job.title = ''
    job.percent = 0
    job.status = 'extracting'
    job.detail = 'starting'
    job.phase = 'downloading'
    job.cancelled = false
    emit(job.progressevent, {
      percent: 0,
      eta: 'starting',
      status: 'extracting',
    })

    const bins = this.resolvebinaries()
    const ytdlp = bins.ytdlp
    const jspath = bins.jspath
    const ffdir = bins.ffdir
    const ffprobe = bins.ffprobe

    if (job.cancelled) {
      job.phase = 'idle'
      return null
    }

    const cookiesbrowser = this.cookiesbrowser
    const ctx: MQ_YTDLP_CTX = {
      ytdlp,
      jspath,
      ytdlphome: this.ytdlphome,
      ffdir,
      cachedir: this.cachedir,
      attempt: 1,
      cookiesbrowser,
      url: trimmed,
      allowlong,
    }

    let profile: MQ_YTDLP_PROFILE = 'video'
    let result: MQ_YTDLP_RESULT = {
      success: false,
      outpath: '',
      title: '',
      artist: '',
      album: '',
      channel: '',
      message: '',
      errlines: [],
    }
    const formattries = ytdlpformattriesforurl(trimmed, audioonly)
    for (let ti = 0; ti < formattries.length; ti += 1) {
      if (job.cancelled) {
        break
      }
      const formattry = formattries[ti]
      if (ti > 0) {
        removepartialfiles(this.cachedir, this.protectedpaths())
      }
      job.status = 'extracting'
      job.detail = formattry.label
      emit(job.progressevent, {
        percent: 0,
        eta: formattry.label,
        status: 'extracting',
      })
      profile = formattry.profile
      result = await runytdlpdownload(job, emit, ctx, formattry)
      if (result.success) {
        break
      }
    }

    if (job.cancelled) {
      job.phase = 'idle'
      return null
    }

    const outpathexists = result.outpath && fs.existsSync(result.outpath)
    if (result.success && outpathexists) {
      const probe = probemediafile(ffprobe, result.outpath)
      if (validatemediafile(result.outpath, probe)) {
        const audioonly = mediaisaudioonly(result.outpath, probe, profile)
        job.filepath = result.outpath
        job.title = result.title
        job.percent = 100
        job.status = 'downloading'
        job.detail = ''
        emit(job.progressevent, {
          percent: 100,
          eta: '',
          status: 'downloading',
        })
        job.phase = 'ready'
        const payload: MQ_READY_PAYLOAD = {
          path: result.outpath,
          title: result.title,
          artist: result.artist,
          album: result.album,
          channel: result.channel,
          audioOnly: audioonly,
          artwork: resolveartworkpath(result.outpath),
          duration: 0,
        }
        if (job === this.playback) {
          this.claimplayingmedia(payload.path, payload.artwork)
        }
        emit(job.readyevent, payload)
        return payload
      }
      result.message = 'downloaded file failed media validation'
    }

    job.error = result.message
    job.phase = 'error'
    emit(job.errorevent, { message: result.message } satisfies MQ_ERROR_EVENT)
    return null
  }

  async probeduration(url: string): Promise<MQ_PROBE_META> {
    const trimmed = String(url || '').trim()
    if (!trimmed) {
      return probefailure('url required')
    }
    const bins = this.resolvebinaries()
    const ctx: MQ_YTDLP_CTX = {
      ytdlp: bins.ytdlp,
      jspath: bins.jspath,
      ytdlphome: this.ytdlphome,
      ffdir: bins.ffdir,
      cachedir: this.cachedir,
      attempt: 1,
      cookiesbrowser: this.cookiesbrowser,
      url: trimmed,
    }
    const args = buildytdlpprobeargs(ctx)
    return await new Promise((resolve) => {
      const child = spawn(ctx.ytdlp, args, {
        cwd: ctx.cachedir,
        env: { ...process.env, XDG_CACHE_HOME: ctx.ytdlphome },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      let stdout = ''
      let stderr = ''
      let settled = false
      let timer: ReturnType<typeof setTimeout> | null = null
      const settle = (meta: MQ_PROBE_META) => {
        if (settled) {
          return
        }
        settled = true
        if (timer) {
          clearTimeout(timer)
          timer = null
        }
        resolve(meta)
      }
      timer = setTimeout(() => {
        child.kill()
        settle(probefailure('probe timed out'))
      }, MQ_PROBE_TIMEOUT_MS)
      child.stdout?.on('data', (chunk: Buffer | string) => {
        stdout += String(chunk)
      })
      child.stderr?.on('data', (chunk: Buffer | string) => {
        stderr += String(chunk)
      })
      child.on('close', (code) => {
        if (code !== 0) {
          settle(probefailure(probeerrormessage(stderr, code)))
          return
        }
        const lines = stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
        const title = lines[0] || ''
        const durationsec = Number(lines[1])
        settle({
          title,
          durationsec: Number.isFinite(durationsec) ? durationsec : 0,
          failed: false,
          error: '',
          audioonly: isstaticframevideo(
            Number(lines[2]),
            Number(lines[3]),
            Number(lines[4]),
          ),
        })
      })
      child.on('error', (err: unknown) => {
        settle(probefailure(err instanceof Error ? err.message : String(err)))
      })
    })
  }

  async probebatch(
    url: string,
    count: number,
    emit: MQ_EMIT,
  ): Promise<MQ_PROBE_BATCH> {
    const trimmed = String(url || '').trim()
    if (!trimmed || count < 1) {
      return { entries: [], error: 'url required' }
    }
    const bins = this.resolvebinaries()
    const ctx: MQ_YTDLP_CTX = {
      ytdlp: bins.ytdlp,
      jspath: bins.jspath,
      ytdlphome: this.ytdlphome,
      ffdir: bins.ffdir,
      cachedir: this.cachedir,
      attempt: 1,
      cookiesbrowser: this.cookiesbrowser,
      url: trimmed,
    }
    const args = buildytdlpprobebatchargs(ctx, count)
    return await new Promise((resolve) => {
      const child = spawn(ctx.ytdlp, args, {
        cwd: ctx.cachedir,
        env: { ...process.env, XDG_CACHE_HOME: ctx.ytdlphome },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      let stdout = ''
      let stderr = ''
      let partial = ''
      let resolved = 0
      let settled = false
      let timer: ReturnType<typeof setTimeout> | null = null
      const settle = (batch: MQ_PROBE_BATCH) => {
        if (settled) {
          return
        }
        settled = true
        if (timer) {
          clearTimeout(timer)
          timer = null
        }
        resolve(batch)
      }
      timer = setTimeout(() => {
        child.kill()
        // Keep whatever resolved before the ceiling; the rest report as unread.
        settle({
          entries: probebatchentries(stdout),
          error: 'metadata scan timed out',
        })
      }, probebatchtimeoutms(count))
      child.stdout?.on('data', (chunk: Buffer | string) => {
        const text = String(chunk)
        stdout += text
        // yt-dlp prints a line the moment it resolves an entry, so report each
        // one instead of leaving the queue silent for the whole scan.
        partial += text
        const split = partial.split(/\r?\n/)
        partial = split.pop() ?? ''
        for (const line of split) {
          for (const entry of probebatchentries(line)) {
            resolved += 1
            emit('mq-probe-progress', {
              index: resolved,
              total: count,
              entry,
            } satisfies MQ_PROBE_PROGRESS)
          }
        }
      })
      child.stderr?.on('data', (chunk: Buffer | string) => {
        stderr += String(chunk)
      })
      child.on('close', (code) => {
        const entries = probebatchentries(stdout)
        // --ignore-errors exits non-zero when any entry failed, so a bad code
        // describes the missing entries rather than the run as a whole.
        const error = stderr.includes('ERROR:')
          ? probeerrormessage(stderr, code)
          : ''
        settle({ entries, error })
      })
      child.on('error', (err: unknown) => {
        settle({
          entries: [],
          error: err instanceof Error ? err.message : String(err),
        })
      })
    })
  }

  async expandplaylist(url: string): Promise<MQ_PLAYLIST_EXPAND> {
    const single: MQ_PLAYLIST_EXPAND = { kind: 'single' }
    const trimmed = String(url || '').trim()
    if (!trimmed) {
      return single
    }
    const bins = this.resolvebinaries()
    const ctx: MQ_YTDLP_CTX = {
      ytdlp: bins.ytdlp,
      jspath: bins.jspath,
      ytdlphome: this.ytdlphome,
      ffdir: bins.ffdir,
      cachedir: this.cachedir,
      attempt: 1,
      cookiesbrowser: this.cookiesbrowser,
      url: trimmed,
    }
    const args = buildytdlpplaylistargs(ctx)
    return await new Promise((resolve) => {
      const child = spawn(ctx.ytdlp, args, {
        cwd: ctx.cachedir,
        env: { ...process.env, XDG_CACHE_HOME: ctx.ytdlphome },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      let stdout = ''
      let settled = false
      const timer = setTimeout(() => {
        if (settled) {
          return
        }
        settled = true
        child.kill()
        resolve(single)
      }, MQ_PLAYLIST_EXPAND_TIMEOUT_MS)
      child.stdout?.on('data', (chunk: Buffer | string) => {
        stdout += String(chunk)
      })
      child.on('close', () => {
        if (settled) {
          return
        }
        settled = true
        clearTimeout(timer)
        const entries = mqparseplaylistflatstdout(stdout, trimmed)
        if (entries.length < 2) {
          resolve(single)
          return
        }
        resolve({ kind: 'playlist', entries })
      })
      child.on('error', () => {
        if (settled) {
          return
        }
        settled = true
        clearTimeout(timer)
        resolve(single)
      })
    })
  }

  async startdownload(
    url: string,
    emit: MQ_EMIT,
    allowlong = false,
    audioonly = false,
  ): Promise<MQ_DOWNLOAD_STATE> {
    const trimmed = String(url || '').trim()
    // Adopt an in-flight prep for this URL instead of canceling it -- short
    // clips otherwise thrash when the playhead catches the lead download.
    const prepjob = this.prepjobs.get(trimmed)
    if (prepjob && prepjob.phase === 'downloading' && prepjob.activethread) {
      try {
        await prepjob.activethread
      } catch (_) {}
    }
    this.canceljob(this.playback)
    this.canceljobpartials(this.playback)
    this.playback.url = ''
    resetjob(this.playback)
    this.playback.progressevent = 'mq-download-progress'
    this.playback.readyevent = 'mq-download-ready'
    this.playback.errorevent = 'mq-download-error'

    const run = async (): Promise<void> => {
      // Yield so renderer download listeners are attached before ready emit.
      await Promise.resolve()
      const cached = this.readregistryready(trimmed)
      if (cached) {
        this.playback.url = trimmed
        this.playback.filepath = cached.path
        this.playback.title = cached.title
        this.playback.percent = 100
        this.playback.status = 'downloading'
        this.playback.detail = ''
        this.playback.phase = 'ready'
        this.claimplayingmedia(cached.path, cached.artwork)
        emit(this.playback.readyevent, {
          path: cached.path,
          title: cached.title,
          artist: cached.artist || '',
          album: cached.album || '',
          channel: cached.channel || '',
          audioOnly: cached.audioOnly,
          artwork: cached.artwork || '',
          duration: 0,
        } satisfies MQ_READY_PAYLOAD)
        return
      }
      await this.runjobdownload(this.playback, url, emit, allowlong, audioonly)
    }

    this.playback.activethread = run().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err)
      this.playback.error = message || String(err)
      this.playback.phase = 'error'
      emit('mq-download-error', {
        message: this.playback.error,
      } satisfies MQ_ERROR_EVENT)
    })

    return this.readstate()
  }

  async startprep(
    url: string,
    emit: MQ_EMIT,
    allowlong = false,
    audioonly = false,
  ): Promise<MQ_JOB_STATE> {
    const trimmed = String(url || '').trim()
    if (!trimmed) {
      return this.readprepstate()
    }

    const ready = this.readregistryready(trimmed)
    if (ready) {
      const job = this.prepjobs.get(trimmed) || createjob()
      job.url = trimmed
      job.phase = 'ready'
      job.percent = 100
      job.status = 'ready'
      job.filepath = ready.path
      job.title = ready.title
      this.prepjobs.set(trimmed, job)
      return readjobstate(job)
    }

    const existing = this.prepjobs.get(trimmed)
    if (existing && existing.phase === 'downloading') {
      return readjobstate(existing)
    }

    if (this.countprepdownloading() >= MQ_PREP_CONCURRENCY) {
      return {
        url: trimmed,
        phase: 'idle',
        percent: 0,
        status: 'queued',
        detail: '',
        path: '',
        error: '',
      }
    }

    const job = createjob()
    job.url = trimmed
    job.phase = 'downloading'
    job.progressevent = 'mq-prep-progress'
    job.readyevent = 'mq-prep-ready'
    job.errorevent = 'mq-prep-error'
    this.prepjobs.set(trimmed, job)
    this.prepemit = emit
    this.prepallowlong = allowlong
    this.prepaudioonly = audioonly
    this.clearprepretry()

    const run = async (): Promise<void> => {
      const payload = await this.runjobdownload(
        job,
        trimmed,
        emit,
        allowlong,
        audioonly,
      )
      if (jobcancelled(job)) {
        return
      }
      if (payload) {
        this.setregistryready(trimmed, payload)
        this.prepretryattempt = 0
        return
      }
      if (this.prepjobs.get(trimmed) === job && this.prepemit) {
        this.scheduleprepretry(trimmed, this.prepemit)
      }
    }

    job.activethread = run().catch(() => {
      if (this.prepjobs.get(trimmed) === job && this.prepemit) {
        this.scheduleprepretry(trimmed, this.prepemit)
      }
    })

    return readjobstate(job)
  }

  seedregistryready(url: string, meta: MQ_REGISTRY_META): void {
    this.setregistryready(url, meta)
  }
}

function jobcancelled(job: MQ_DOWNLOAD_JOB): boolean {
  return job.cancelled || job.phase === 'idle'
}
