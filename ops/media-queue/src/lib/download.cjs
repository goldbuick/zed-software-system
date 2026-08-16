'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')
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
const FFMPEG_POST_ARGS_COPY =
  'ffmpeg:-c:v copy -c:a copy -movflags +faststart'
const FFMPEG_POST_ARGS_TRANSCODE =
  'ffmpeg:-c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart'
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
    if (!name.startsWith('mq-')) {
      if (
        !(
          includepartials &&
          (name.endsWith('.part') ||
            name.endsWith('.ytdl') ||
            name.endsWith('.temp'))
        )
      ) {
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
    if (!name.startsWith('mq-') || !name.endsWith('.mp4')) {
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

function emitline(manager, emit, line) {
  if (!line) {
    return
  }
  if (line.includes('%')) {
    const pct = parsepercent(line)
    if (pct === null) {
      return
    }
    const status = ytdlpprogressstatus(line)
    const eta = parseeta(line)
    manager.percent = pct
    manager.status = status
    manager.detail = eta
    emit('mq-download-progress', {
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
  manager.status = phase
  manager.detail = detail
  emit('mq-download-progress', {
    percent: manager.percent,
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

class DownloadManager {
  constructor(resourceroot, cachedir) {
    this.resourceroot = resourceroot
    this.cachedir = cachedir
    this.ytdlphome = path.join(cachedir, 'ytdlp-home')
    this.cookiesbrowser = ''
    this.phase = 'idle'
    this.percent = 0
    this.status = 'idle'
    this.detail = ''
    this.filepath = ''
    this.error = ''
    this.cancelled = false
    this.activechild = null
    this.activethread = null
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
      phase: this.phase,
      percent: this.percent,
      status: this.status,
      detail: this.detail,
      path: this.filepath,
      error: this.error,
      cacheBytes: mediafilebytes(this.cachedir),
    }
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

  canceljob() {
    this.cancelled = true
    if (this.activechild) {
      try {
        this.activechild.kill()
      } catch (_) {}
      this.activechild = null
    }
  }

  canceldownload() {
    this.canceljob()
    removemqmediafiles(this.cachedir, true)
    if (this.phase === 'downloading') {
      this.phase = 'idle'
      this.percent = 0
      this.status = 'idle'
      this.detail = ''
    }
    this.cancelled = false
  }

  cleardownloads() {
    this.canceldownload()
    this.filepath = ''
    this.error = ''
    this.percent = 0
    this.status = 'idle'
    this.detail = ''
    this.phase = 'idle'
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

  async startdownload(url, emit) {
    const trimmed = String(url || '').trim()
    if (!trimmed) {
      throw new Error('url required')
    }

    this.canceldownload()
    this.error = ''
    this.filepath = ''
    this.percent = 0
    this.status = 'extracting'
    this.detail = 'starting'
    this.phase = 'downloading'
    this.cancelled = false
    emit('mq-download-progress', {
      percent: 0,
      eta: 'starting',
      status: 'extracting',
    })

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
    const jspath = `deno:${denopath}`
    const ffdir = ffmpegdir(ffmpeg)

    const run = async () => {
      let lastmessage = ''
      const usercookies = this.cookiesbrowser

      for (let attempt = 1; attempt <= MAX_DOWNLOAD_ATTEMPTS; attempt += 1) {
        if (this.cancelled) {
          this.phase = 'idle'
          return
        }

        if (attempt > 1) {
          removemqmediafiles(this.cachedir, true)
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
        this.percent = 0
        this.status = 'extracting'
        this.detail = 'starting'
        emit('mq-download-progress', {
          percent: 0,
          eta: 'starting',
          status: 'extracting',
        })

        const postargs =
          attempt === 1 ? FFMPEG_POST_ARGS_COPY : FFMPEG_POST_ARGS_TRANSCODE
        const args = []
        applyytdlpbaseargs(args, jspath, this.ytdlphome, attempt)
        applyytdlpdownloadargs(args, attempt)
        applyytdlpcookies(args, cookiesbrowser)
        args.push(
          '-f',
          YTDLP_FORMAT,
          '--merge-output-format',
          'mp4',
          '--force-overwrites',
          '--postprocessor-args',
          postargs,
          '--no-playlist',
          '--progress',
          '--newline',
          '--ffmpeg-location',
          ffdir,
          '-o',
          'mq-%(id)s.%(ext)s',
          '--print',
          'after_move:filepath',
          trimmed,
        )

        const child = spawn(ytdlp, args, {
          cwd: this.cachedir,
          env: { ...process.env, XDG_CACHE_HOME: this.ytdlphome },
          stdio: ['ignore', 'pipe', 'pipe'],
        })
        this.activechild = child

        let outpath = ''
        const errlines = []

        const stdoutdone = readstreamlines(child.stdout, (line) => {
          if (this.cancelled) {
            return
          }
          emitline(this, emit, line)
          outpath = captureytdlpoutpath(outpath, line)
        })
        const stderrdone = readstreamlines(child.stderr, (line) => {
          if (this.cancelled) {
            return
          }
          emitline(this, emit, line)
          if (line.trim()) {
            errlines.push(line)
          }
        })

        const code = await new Promise((resolve) => {
          child.on('close', resolve)
        })
        await Promise.all([stdoutdone, stderrdone])
        this.activechild = null

        if (this.cancelled) {
          this.phase = 'idle'
          return
        }

        const success = code === 0
        const outpathexists = outpath && fs.existsSync(outpath)
        if (success && outpathexists && !mp4containervalid(outpath)) {
          lastmessage = 'downloaded file is not a valid mp4 container'
          continue
        }
        if (success && outpathexists) {
          this.filepath = outpath
          this.percent = 100
          this.status = 'downloading'
          this.detail = ''
          emit('mq-download-progress', {
            percent: 100,
            eta: '',
            status: 'downloading',
          })
          this.phase = 'ready'
          emit('mq-download-ready', {
            path: outpath,
            title: '',
            duration: 0,
          })
          return
        }

        lastmessage = errlines.length
          ? formatytdlperror(errlines, code)
          : `yt-dlp exited with status ${code ?? -1}`
      }

      this.error = lastmessage
      this.phase = 'error'
      emit('mq-download-error', { message: lastmessage })
    }

    this.activethread = run().catch((err) => {
      this.error = err.message || String(err)
      this.phase = 'error'
      emit('mq-download-error', { message: this.error })
    })

    return this.readstate()
  }
}

module.exports = { DownloadManager }
