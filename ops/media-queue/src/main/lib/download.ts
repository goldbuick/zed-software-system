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
} from '../../shared/ipc'

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

const AUDIO_FILE_EXTENSIONS = new Set([
  '.m4a',
  '.mp3',
  '.opus',
  '.ogg',
  '.aac',
])

type MQ_RESOLVED_BINS = {
  ytdlp: string
  jspath: string
  ffdir: string
  ffprobe: string
}

type MQ_YTDLP_PROFILE = 'video' | 'audio'

type MQ_YTDLP_CTX = {
  ytdlp: string
  jspath: string
  ytdlphome: string
  ffdir: string
  cachedir: string
  attempt: number
  cookiesbrowser: string
  url: string
}

type MQ_YTDLP_RESULT = {
  success: boolean
  outpath: string
  title: string
  message: string
  errlines: string[]
}

type MQ_PRUNE_RESULT = {
  deletedCount: number
}

type MQ_CLEAR_RESULT = {
  deletedCount: number
  freedBytes: number
}

const MAX_DOWNLOAD_ATTEMPTS = 4
export const YTDLP_FORMAT =
  'best[height<=720][vcodec^=avc][ext=mp4][acodec^=mp4a]/bestvideo[vcodec^=avc1][height<=720][ext=mp4]+bestaudio[acodec^=mp4a][ext=m4a]/bestvideo[vcodec^=avc][height<=720]+bestaudio/best[height<=720]'
export const YTDLP_AUDIO_FORMAT = 'bestaudio[ext=m4a]/bestaudio/best'
const MQ_MEDIA_EXTENSIONS = new Set([
  '.mp4',
  '.m4a',
  '.mp3',
  '.opus',
  '.webm',
  '.aac',
  '.ogg',
])
// Scope to Merger/Remuxer/Convertor only -- never use bare `ffmpeg:` / `FFmpeg:`.
// That prefix hits ThumbnailsConvertor too and breaks --convert-thumbnails jpg
// (ERROR: Preprocessing: Conversion failed!).
export const FFMPEG_POST_ARGS_COPY =
  'Merger+VideoRemuxer:-c:v copy -c:a copy -movflags +faststart'
export const FFMPEG_POST_ARGS_TRANSCODE =
  'Merger+VideoRemuxer+VideoConvertor:-c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart'
export const FFMPEG_POST_ARGS_AUDIO = 'ExtractAudio+FixupM4a:-c:a aac -b:a 128k'
const YOUTUBE_PLAYER_CLIENTS = [
  'default,-android_sdkless',
  'default,-android_vr',
  'tv,web_creator',
  'web,web_creator',
]
const COOKIE_BROWSERS = [
  'safari',
  'chrome',
  'firefox',
  'brave',
  'edge',
  'chromium',
]

function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function youtubeplayerclient(attempt: number): string {
  const idx = (attempt - 1) % YOUTUBE_PLAYER_CLIENTS.length
  return `youtube:player_client=${YOUTUBE_PLAYER_CLIENTS[idx]}`
}

function defaultcookiefallbacks(): string[] {
  if (process.platform === 'darwin') {
    return ['safari', 'chrome', 'firefox']
  }
  if (process.platform === 'win32') {
    return ['chrome', 'edge', 'firefox']
  }
  return ['chrome', 'firefox']
}

function ytdlpneedscookiesauth(message: string): boolean {
  const lower = String(message).toLowerCase()
  return (
    lower.includes('sign in') ||
    lower.includes('cookies-from-browser') ||
    lower.includes('use --cookies')
  )
}

function resolvecookiesbrowser(
  attempt: number,
  userbrowser: string,
  lastmessage: string,
): string {
  if (userbrowser) {
    return userbrowser
  }
  if (attempt === 1) {
    return ''
  }
  const fallbacks = defaultcookiefallbacks()
  if (ytdlpneedscookiesauth(lastmessage)) {
    const idx = (attempt - 2) % fallbacks.length
    return fallbacks[idx]
  }
  if (attempt > 4) {
    const idx = (attempt - 5) % fallbacks.length
    return fallbacks[idx]
  }
  return ''
}

function clearytdlpextractorcache(ytdlphome: string): void {
  const cache = path.join(ytdlphome, 'yt-dlp')
  if (fs.existsSync(cache)) {
    fs.rmSync(cache, { recursive: true, force: true })
  }
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

function ytdlpneedsaudiofallback(message: string): boolean {
  const lower = String(message).toLowerCase()
  return (
    lower.includes('requested format is not available') ||
    lower.includes('no video formats') ||
    lower.includes('does not contain a video') ||
    lower.includes('format is not available') ||
    lower.includes('only images are available')
  )
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

function captureytdlptitle(current: string, line: string): string {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('[')) {
    return current
  }
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    return current
  }
  return trimmed.slice(0, 120)
}

function applyytdlpbaseargs(
  args: string[],
  jspath: string,
  _ytdlphome: string,
  attempt: number,
): void {
  args.push(
    '--no-update',
    '--js-runtimes',
    jspath,
    '--remote-components',
    'ejs:github',
    '--extractor-args',
    youtubeplayerclient(attempt),
  )
}

function applyytdlpdownloadargs(args: string[], attempt: number): void {
  args.push('--retries', '10', '--fragment-retries', '10')
  if (attempt > 1) {
    args.push('--sleep-requests', '1')
  }
}

function applyytdlpcookies(args: string[], browser: string): void {
  if (browser) {
    args.push('--cookies-from-browser', browser)
  }
}

function buildytdlpargs(
  profile: MQ_YTDLP_PROFILE,
  ctx: MQ_YTDLP_CTX,
): string[] {
  const args: string[] = []
  applyytdlpbaseargs(args, ctx.jspath, ctx.ytdlphome, ctx.attempt)
  applyytdlpdownloadargs(args, ctx.attempt)
  applyytdlpcookies(args, ctx.cookiesbrowser)
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
      ctx.attempt === 1 ? FFMPEG_POST_ARGS_COPY : FFMPEG_POST_ARGS_TRANSCODE
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
    'title',
    '--print',
    'after_move:filepath',
    ctx.url,
  )
  return args
}

async function runytdlpdownload(
  job: MQ_DOWNLOAD_JOB,
  emit: MQ_EMIT,
  ctx: MQ_YTDLP_CTX,
  profile: MQ_YTDLP_PROFILE,
): Promise<MQ_YTDLP_RESULT> {
  const args = buildytdlpargs(profile, ctx)
  const child = spawn(ctx.ytdlp, args, {
    cwd: ctx.cachedir,
    env: { ...process.env, XDG_CACHE_HOME: ctx.ytdlphome },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  job.activechild = child

  let outpath = ''
  let title = ''
  const errlines: string[] = []

  const stdoutdone = readstreamlines(child.stdout, (line) => {
    if (job.cancelled) {
      return
    }
    emitline(job, emit, line)
    title = captureytdlptitle(title, line)
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
    title,
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

export class DownloadManager {
  resourceroot: string
  cachedir: string
  ytdlphome: string
  cookiesbrowser: string
  playback: MQ_DOWNLOAD_JOB
  prep: MQ_DOWNLOAD_JOB
  registry: Map<string, MQ_REGISTRY_ENTRY>
  /** Active decode path; survives job reset so removepartialfiles cannot wipe mid-load. */
  playingpath: string
  playingartwork: string
  prepretrytimer: NodeJS.Timeout | null
  prepretryattempt: number
  prepemit: MQ_EMIT | null

  constructor(resourceroot: string, cachedir: string) {
    this.resourceroot = resourceroot
    this.cachedir = cachedir
    this.ytdlphome = path.join(cachedir, 'ytdlp-home')
    this.cookiesbrowser = ''
    this.playback = createjob()
    this.prep = createjob()
    this.prep.progressevent = 'mq-prep-progress'
    this.prep.readyevent = 'mq-prep-ready'
    this.prep.errorevent = 'mq-prep-error'
    this.registry = new Map()
    this.playingpath = ''
    this.playingartwork = ''
    this.prepretrytimer = null
    this.prepretryattempt = 0
    this.prepemit = null
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
    const entry = this.prep.url ? this.registry.get(this.prep.url) : null
    if (entry && entry.state === 'ready') {
      return {
        url: this.prep.url,
        phase: 'ready',
        percent: 100,
        status: 'ready',
        detail: '',
        path: entry.path,
        error: '',
      }
    }
    return readjobstate(this.prep)
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
    if (this.prep.filepath) {
      paths.push(this.prep.filepath)
      const prepart = resolveartworkpath(this.prep.filepath)
      if (prepart) {
        paths.push(prepart)
      }
    }
    return paths
  }

  setregistryready(url: string, meta: MQ_REGISTRY_META): void {
    this.registry.set(url, {
      path: meta.path,
      title: meta.title,
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
    // Claim before dropping registry so cancelprep / download retries cannot
    // removepartialfiles the file while the renderer is still opening it.
    this.claimplayingmedia(entry.path, entry.artwork)
    this.registry.delete(trimmed)
    if (this.prep.url === trimmed) {
      resetjob(this.prep)
    }
    return {
      path: entry.path,
      title: entry.title,
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
      if (this.prep.url !== url || this.prep.phase === 'ready') {
        return
      }
      void this.startprep(url, emit)
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
    applyytdlpbaseargs(args, `deno:${denopath}`, this.ytdlphome, 1)
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
    this.canceljob(this.prep)
    this.canceljobpartials(this.prep)
    this.prep.url = ''
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

    let lastmessage = ''
    const usercookies = this.cookiesbrowser

    for (let attempt = 1; attempt <= MAX_DOWNLOAD_ATTEMPTS; attempt += 1) {
      if (job.cancelled) {
        job.phase = 'idle'
        return null
      }

      if (attempt > 1) {
        removepartialfiles(this.cachedir, this.protectedpaths())
        if (lastmessage.includes('403') || ytdlpneedscookiesauth(lastmessage)) {
          clearytdlpextractorcache(this.ytdlphome)
        }
        await sleep(
          lastmessage.includes('403') || ytdlpneedscookiesauth(lastmessage)
            ? 3000
            : 1500,
        )
      }

      const cookiesbrowser = resolvecookiesbrowser(
        attempt,
        usercookies,
        lastmessage,
      )
      job.percent = 0
      job.status = 'extracting'
      job.detail = 'starting'
      emit(job.progressevent, {
        percent: 0,
        eta: 'starting',
        status: 'extracting',
      })

      const ctx: MQ_YTDLP_CTX = {
        ytdlp,
        jspath,
        ytdlphome: this.ytdlphome,
        ffdir,
        cachedir: this.cachedir,
        attempt,
        cookiesbrowser,
        url: trimmed,
      }

      let profile: MQ_YTDLP_PROFILE = 'video'
      let result = await runytdlpdownload(job, emit, ctx, 'video')
      if (
        !result.success &&
        ytdlpneedsaudiofallback(result.message) &&
        !job.cancelled
      ) {
        removepartialfiles(this.cachedir, this.protectedpaths())
        job.status = 'extracting'
        job.detail = 'audio-only'
        emit(job.progressevent, {
          percent: 0,
          eta: 'audio-only',
          status: 'extracting',
        })
        profile = 'audio'
        result = await runytdlpdownload(job, emit, ctx, 'audio')
      }

      if (job.cancelled) {
        job.phase = 'idle'
        return null
      }

      const outpathexists = result.outpath && fs.existsSync(result.outpath)
      if (result.success && outpathexists) {
        const probe = probemediafile(ffprobe, result.outpath)
        if (!validatemediafile(result.outpath, probe)) {
          lastmessage = 'downloaded file failed media validation'
          continue
        }
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

      lastmessage = result.message
    }

    job.error = lastmessage
    job.phase = 'error'
    emit(job.errorevent, { message: lastmessage } satisfies MQ_ERROR_EVENT)
    return null
  }

  async startdownload(url: string, emit: MQ_EMIT): Promise<MQ_DOWNLOAD_STATE> {
    const trimmed = String(url || '').trim()
    if (this.prep.url === trimmed) {
      this.cancelprep()
    }
    this.canceljob(this.playback)
    this.canceljobpartials(this.playback)
    this.playback.url = ''
    resetjob(this.playback)
    this.playback.progressevent = 'mq-download-progress'
    this.playback.readyevent = 'mq-download-ready'
    this.playback.errorevent = 'mq-download-error'

    const run = async (): Promise<void> => {
      await this.runjobdownload(this.playback, url, emit)
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

  async startprep(url: string, emit: MQ_EMIT): Promise<MQ_JOB_STATE> {
    const trimmed = String(url || '').trim()
    if (!trimmed) {
      return this.readprepstate()
    }

    const ready = this.readregistryready(trimmed)
    if (ready) {
      this.prep.url = trimmed
      this.prep.phase = 'ready'
      this.prep.percent = 100
      this.prep.status = 'ready'
      this.prep.filepath = ready.path
      this.prep.title = ready.title
      return this.readprepstate()
    }

    if (this.prep.url === trimmed && this.prep.phase === 'downloading') {
      return this.readprepstate()
    }

    if (this.prep.url !== trimmed) {
      this.cancelprep()
    }

    this.prepemit = emit
    this.clearprepretry()
    resetjob(this.prep)
    this.prep.url = trimmed
    this.prep.progressevent = 'mq-prep-progress'
    this.prep.readyevent = 'mq-prep-ready'
    this.prep.errorevent = 'mq-prep-error'

    const run = async (): Promise<void> => {
      const payload = await this.runjobdownload(this.prep, trimmed, emit)
      if (jobcancelled(this.prep)) {
        return
      }
      if (payload) {
        this.setregistryready(trimmed, payload)
        this.prepretryattempt = 0
        return
      }
      if (this.prep.url === trimmed && this.prepemit) {
        this.scheduleprepretry(trimmed, this.prepemit)
      }
    }

    this.prep.activethread = run().catch(() => {
      if (this.prep.url === trimmed && this.prepemit) {
        this.scheduleprepretry(trimmed, this.prepemit)
      }
    })

    return this.readprepstate()
  }

  seedregistryready(url: string, meta: MQ_REGISTRY_META): void {
    this.setregistryready(url, meta)
  }
}

function jobcancelled(job: MQ_DOWNLOAD_JOB): boolean {
  return job.cancelled || job.phase === 'idle'
}
