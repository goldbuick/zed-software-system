'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { spawn, execFileSync } = require('node:child_process')
const readline = require('node:readline')
const {
  resolveytdlp,
  resolveffmpeg,
  resolvedeno,
  ffmpegdir,
} = require('./bins.cjs')

const MAX_DOWNLOAD_ATTEMPTS = 4
const YTDLP_FORMAT =
  'best[height<=720][vcodec^=avc][ext=mp4][acodec^=mp4a]/bestvideo[vcodec^=avc1][height<=720][ext=mp4]+bestaudio[acodec^=mp4a][ext=m4a]/bestvideo[vcodec^=avc][height<=720]+bestaudio/best[height<=720]'
const YTDLP_AUDIO_FORMAT = 'bestaudio[ext=m4a]/bestaudio/best'
const MQ_MEDIA_EXTENSIONS = new Set([
  '.mp4',
  '.m4a',
  '.mp3',
  '.opus',
  '.webm',
  '.aac',
  '.ogg',
])
const FFMPEG_POST_ARGS_COPY =
  'ffmpeg:-c:v copy -c:a copy -movflags +faststart'
const FFMPEG_POST_ARGS_TRANSCODE =
  'ffmpeg:-c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart'
const FFMPEG_POST_ARGS_AUDIO = 'ffmpeg:-c:a aac -b:a 128k'
const YOUTUBE_PLAYER_CLIENTS = [
  'default,-android_sdkless',
  'default,-android_vr',
  'tv,web_creator',
  'web,web_creator',
]
const COOKIE_BROWSERS = ['safari', 'chrome', 'firefox', 'brave', 'edge', 'chromium']

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function youtubeplayerclient(attempt) {
  const idx = (attempt - 1) % YOUTUBE_PLAYER_CLIENTS.length
  return `youtube:player_client=${YOUTUBE_PLAYER_CLIENTS[idx]}`
}

function defaultcookiefallbacks() {
  if (process.platform === 'darwin') {
    return ['safari', 'chrome', 'firefox']
  }
  if (process.platform === 'win32') {
    return ['chrome', 'edge', 'firefox']
  }
  return ['chrome', 'firefox']
}

function ytdlpneedscookiesauth(message) {
  const lower = String(message).toLowerCase()
  return (
    lower.includes('sign in') ||
    lower.includes('cookies-from-browser') ||
    lower.includes('use --cookies')
  )
}

function resolvecookiesbrowser(attempt, userbrowser, lastmessage) {
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

function clearytdlpextractorcache(ytdlphome) {
  const cache = path.join(ytdlphome, 'yt-dlp')
  if (fs.existsSync(cache)) {
    fs.rmSync(cache, { recursive: true, force: true })
  }
}

function ismqmediafile(name) {
  if (!name.startsWith('mq-')) {
    return false
  }
  const ext = path.extname(name).toLowerCase()
  return MQ_MEDIA_EXTENSIONS.has(ext)
}

function ispartialfilename(name) {
  return (
    name.endsWith('.part') ||
    name.endsWith('.ytdl') ||
    name.endsWith('.temp')
  )
}

function removefilepath(filepath) {
  if (!filepath || !fs.existsSync(filepath)) {
    return false
  }
  fs.rmSync(filepath, { force: true })
  return true
}

function removepartialfiles(cachedir, protectpaths) {
  let deleted = 0
  if (!fs.existsSync(cachedir)) {
    return deleted
  }
  const protectedset = new Set()
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

function removemqmediafiles(cachedir, includepartials) {
  let deleted = 0
  if (!fs.existsSync(cachedir)) {
    return deleted
  }
  for (const name of fs.readdirSync(cachedir)) {
    const filepath = path.join(cachedir, name)
    if (!fs.statSync(filepath).isFile()) {
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

function mediafilebytes(cachedir) {
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

function mp4containervalid(filepath) {
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

function resolveffprobe(ffmpeg) {
  const dir = path.dirname(ffmpeg)
  const name = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'
  const probe = path.join(dir, name)
  if (fs.existsSync(probe)) {
    return probe
  }
  return 'ffprobe'
}

function probemediafile(ffprobe, filepath) {
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
        'stream=codec_type',
        '-of',
        'csv=p=0',
        filepath,
      ],
      { encoding: 'utf8' },
    )
    const types = out
      .trim()
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    return {
      hasVideo: types.includes('video'),
      hasAudio: types.includes('audio'),
    }
  } catch (_) {
    return { hasVideo: false, hasAudio: false }
  }
}

function ytdlpneedsaudiofallback(message) {
  const lower = String(message).toLowerCase()
  return (
    lower.includes('requested format is not available') ||
    lower.includes('no video formats') ||
    lower.includes('does not contain a video') ||
    lower.includes('format is not available') ||
    lower.includes('only images are available')
  )
}

function validatemediafile(filepath, probe) {
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

function parsepercent(line) {
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

function parseeta(line) {
  const pos = line.indexOf('ETA ')
  if (pos < 0) {
    return ''
  }
  return line.slice(pos + 4).trim()
}

function ytdlpprogressstatus(line) {
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

function ytdlplogphase(line) {
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

function ytdlplogdetail(line) {
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

function formatytdlperror(errlines, code) {
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

function captureytdlpoutpath(current, line) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('[')) {
    return current
  }
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    return trimmed
  }
  return current
}

function captureytdlptitle(current, line) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('[')) {
    return current
  }
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    return current
  }
  return trimmed.slice(0, 120)
}

function applyytdlpbaseargs(args, jspath, ytdlphome, attempt) {
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

function applyytdlpdownloadargs(args, attempt) {
  args.push('--retries', '10', '--fragment-retries', '10')
  if (attempt > 1) {
    args.push('--sleep-requests', '1')
  }
}

function applyytdlpcookies(args, browser) {
  if (browser) {
    args.push('--cookies-from-browser', browser)
  }
}

function buildytdlpargs(profile, ctx) {
  const args = []
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

async function runytdlpdownload(job, emit, ctx, profile) {
  const args = buildytdlpargs(profile, ctx)
  const child = spawn(ctx.ytdlp, args, {
    cwd: ctx.cachedir,
    env: { ...process.env, XDG_CACHE_HOME: ctx.ytdlphome },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  job.activechild = child

  let outpath = ''
  let title = ''
  const errlines = []

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

  const code = await new Promise((resolve) => {
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

function emitline(job, emit, line) {
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

function readstreamlines(stream, online) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: stream })
    rl.on('line', online)
    rl.on('close', resolve)
  })
}

const PREP_RETRY_DELAYS_MS = [5000, 15000, 45000]

function createjob() {
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

function resetjob(job) {
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

function readjobstate(job) {
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

class DownloadManager {
  constructor(resourceroot, cachedir) {
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
    this.prepretrytimer = null
    this.prepretryattempt = 0
    this.prepemit = null
    fs.mkdirSync(cachedir, { recursive: true })
    fs.mkdirSync(this.ytdlphome, { recursive: true })
  }

  setcookiesbrowser(browser) {
    const trimmed = String(browser || '')
      .trim()
      .toLowerCase()
    if (!trimmed || COOKIE_BROWSERS.includes(trimmed)) {
      this.cookiesbrowser = trimmed
    } else {
      this.cookiesbrowser = ''
    }
  }

  readcookiesbrowser() {
    return this.cookiesbrowser
  }

  readstate() {
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

  readprepstate() {
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

  protectedpaths() {
    const paths = []
    for (const entry of this.registry.values()) {
      if (entry.path) {
        paths.push(entry.path)
      }
    }
    if (this.playback.filepath) {
      paths.push(this.playback.filepath)
    }
    if (this.prep.filepath) {
      paths.push(this.prep.filepath)
    }
    return paths
  }

  setregistryready(url, meta) {
    this.registry.set(url, {
      path: meta.path,
      title: meta.title,
      audioOnly: meta.audioOnly,
      state: 'ready',
    })
  }

  readregistryready(url) {
    const trimmed = String(url || '').trim()
    if (!trimmed) {
      return null
    }
    const entry = this.registry.get(trimmed)
    if (!entry || entry.state !== 'ready' || !entry.path) {
      return null
    }
    if (!fs.existsSync(entry.path)) {
      this.registry.delete(trimmed)
      return null
    }
    return entry
  }

  takeprepready(url) {
    const trimmed = String(url || '').trim()
    if (!trimmed) {
      return null
    }
    const entry = this.readregistryready(trimmed)
    if (!entry) {
      return null
    }
    this.registry.delete(trimmed)
    if (this.prep.url === trimmed) {
      resetjob(this.prep)
    }
    return {
      path: entry.path,
      title: entry.title,
      audioOnly: entry.audioOnly,
      duration: 0,
    }
  }

  prunequeuecache(keepurls, playingurl) {
    const keep = new Set()
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
      this.registry.delete(url)
    }
    return { deletedCount: deleted }
  }

  clearprepretry() {
    if (this.prepretrytimer) {
      clearTimeout(this.prepretrytimer)
      this.prepretrytimer = null
    }
    this.prepretryattempt = 0
  }

  scheduleprepretry(url, emit) {
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

  warmejscache() {
    const ytdlp = resolveytdlp(this.resourceroot)
    const deno = resolvedeno(this.resourceroot)
    if (!fs.existsSync(ytdlp) || !fs.existsSync(deno)) {
      return
    }
    const denopath = fs.realpathSync(deno)
    const args = []
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

  canceljob(job) {
    job.cancelled = true
    if (job.activechild) {
      try {
        job.activechild.kill()
      } catch (_) {}
      job.activechild = null
    }
  }

  canceljobpartials(job) {
    removepartialfiles(this.cachedir, this.protectedpaths())
    if (job.phase === 'downloading') {
      resetjob(job)
    } else {
      job.cancelled = false
    }
  }

  canceldownload() {
    this.canceljob(this.playback)
    this.canceljobpartials(this.playback)
    this.playback.url = ''
  }

  cancelprep() {
    this.clearprepretry()
    this.prepemit = null
    this.canceljob(this.prep)
    this.canceljobpartials(this.prep)
    this.prep.url = ''
  }

  cleardownloads() {
    this.canceldownload()
    this.cancelprep()
    this.registry.clear()
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

  resolvebinaries() {
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

  async runjobdownload(job, url, emit) {
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

      const ctx = {
        ytdlp,
        jspath,
        ytdlphome: this.ytdlphome,
        ffdir,
        cachedir: this.cachedir,
        attempt,
        cookiesbrowser,
        url: trimmed,
      }

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
        const audioonly = probe.hasAudio && !probe.hasVideo
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
        const payload = {
          path: result.outpath,
          title: result.title,
          audioOnly: audioonly,
          duration: 0,
        }
        emit(job.readyevent, payload)
        return payload
      }

      lastmessage = result.message
    }

    job.error = lastmessage
    job.phase = 'error'
    emit(job.errorevent, { message: lastmessage })
    return null
  }

  async startdownload(url, emit) {
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

    const run = async () => {
      await this.runjobdownload(this.playback, url, emit)
    }

    this.playback.activethread = run().catch((err) => {
      this.playback.error = err.message || String(err)
      this.playback.phase = 'error'
      emit('mq-download-error', { message: this.playback.error })
    })

    return this.readstate()
  }

  async startprep(url, emit) {
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

    const run = async () => {
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

  seedregistryready(url, meta) {
    this.setregistryready(url, meta)
  }
}

function jobcancelled(job) {
  return job.cancelled || job.phase === 'idle'
}

module.exports = {
  DownloadManager,
  YTDLP_FORMAT,
  YTDLP_AUDIO_FORMAT,
  FFMPEG_POST_ARGS_COPY,
  FFMPEG_POST_ARGS_TRANSCODE,
  FFMPEG_POST_ARGS_AUDIO,
  removepartialfiles,
  ismqmediafile,
}
