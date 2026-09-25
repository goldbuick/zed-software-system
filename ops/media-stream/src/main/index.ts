import fs from 'node:fs'
import path from 'node:path'

import { BrowserWindow, app, clipboard, ipcMain, nativeImage } from 'electron'

import {
  type MS_DESTINATIONS_DISK,
  msdestinationsanitize,
  msdestinationsdefault,
} from '../shared/destinations'
import type { MS_EMIT, MS_INVOKE_COMMAND, MS_INVOKE_MAP } from '../shared/ipc'

import { type MS_ERTMP_JOB, startertmpjob, stopertmpjob } from './lib/ertmp'
import { resolvefmpegpath } from './lib/ffmpegpath'
import { resolvemspeerid } from './lib/peerid'
import { type MS_RTMP_JOB, startrtmpjob, stoprtmpjob } from './lib/rtmpegress'

const APP_NAME = 'Zed Cafe Media Stream'
const MAIN_WINDOW_WIDTH = 880
const MAIN_WINDOW_HEIGHT = 620
const STREAM_FPS = 30
const H_WIDTH = 1920
const H_HEIGHT = 1080

let mainwin: BrowserWindow | null = null
let streaming = false
const rtmpjobs = new Map<string, MS_RTMP_JOB>()
let ertmpjob: MS_ERTMP_JOB | undefined

function msnetidfilepath(): string {
  const override = String(process.env.MS_NETID_FILE || '').trim()
  if (override) {
    return override
  }
  return path.join(app.getPath('userData'), 'ms-netid')
}

function destinationsfilepath(): string {
  const override = String(process.env.MS_DESTINATIONS_FILE || '').trim()
  if (override) {
    return override
  }
  return path.join(app.getPath('userData'), 'destinations.json')
}

function readdestinations(): MS_DESTINATIONS_DISK {
  try {
    const text = fs.readFileSync(destinationsfilepath(), 'utf8')
    return msdestinationsanitize(JSON.parse(text) as unknown)
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') {
      return msdestinationsdefault()
    }
    throw err
  }
}

function writedestinations(disk: MS_DESTINATIONS_DISK): void {
  const sanitized = msdestinationsanitize(disk)
  fs.mkdirSync(path.dirname(destinationsfilepath()), { recursive: true })
  fs.writeFileSync(
    destinationsfilepath(),
    JSON.stringify(sanitized, null, 2),
    'utf8',
  )
}

function iconpath(): string {
  const icns = path.join(app.getAppPath(), 'resources', 'icons', 'icon.icns')
  if (process.platform === 'darwin' && fs.existsSync(icns)) {
    return icns
  }
  return path.join(app.getAppPath(), 'resources', 'icons', 'icon.png')
}

function applyappicon(): void {
  const iconfile = iconpath()
  if (!fs.existsSync(iconfile)) {
    return
  }
  const image = nativeImage.createFromPath(iconfile)
  if (image.isEmpty()) {
    return
  }
  if (process.platform === 'darwin' && app.dock) {
    void app.dock.setIcon(image)
  }
}

const emitto: MS_EMIT = (event, payload) => {
  if (mainwin && !mainwin.isDestroyed()) {
    mainwin.webContents.send(event, payload)
  }
}

function handleinvoke<K extends MS_INVOKE_COMMAND>(
  cmd: K,
  oninvoke: (
    args: MS_INVOKE_MAP[K]['args'],
  ) => MS_INVOKE_MAP[K]['result'] | Promise<MS_INVOKE_MAP[K]['result']>,
): void {
  ipcMain.handle(cmd, (_event, args: MS_INVOKE_MAP[K]['args']) =>
    oninvoke(args),
  )
}

function stopegressinternal(): void {
  for (const job of rtmpjobs.values()) {
    stoprtmpjob(job)
  }
  rtmpjobs.clear()
  stopertmpjob(ertmpjob)
  ertmpjob = undefined
  streaming = false
  emitto('ms_streaming', { streaming: false })
}

async function startegressinternal(): Promise<{ ok: boolean; error?: string }> {
  stopegressinternal()
  const disk = readdestinations()
  const enabled = disk.destinations.filter((d) => d.enabled && d.streamkey)
  if (enabled.length === 0) {
    return { ok: false, error: 'no enabled destinations with stream keys' }
  }
  const ffmpeg = resolvefmpegpath()
  const errors: string[] = []
  for (const dest of enabled) {
    try {
      if (dest.kind === 'twitch') {
        ertmpjob = await startertmpjob({
          ffmpeg,
          streamkey: dest.streamkey,
          width: H_WIDTH,
          height: H_HEIGHT,
          vwidth: 1080,
          vheight: 1920,
          fps: STREAM_FPS,
          dualformat: disk.encode.dualformat,
          bitratek: 6000,
        })
        ertmpjob.process.on('exit', (code) => {
          if (streaming) {
            emitto('ms_dest_error', {
              id: dest.id,
              error: `twitch egress exited ${code ?? '?'}`,
            })
          }
        })
        ertmpjob.process.stderr?.on('data', (buf: Buffer) => {
          const text = buf.toString('utf8').trim()
          if (text) {
            emitto('ms_status', { status: `twitch: ${text.slice(0, 120)}` })
          }
        })
      } else {
        if (!dest.rtmpurl) {
          errors.push(`${dest.id}: missing rtmp url`)
          continue
        }
        const job = startrtmpjob(dest.id, {
          ffmpeg,
          rtmpurl: dest.rtmpurl,
          streamkey: dest.streamkey,
          width: H_WIDTH,
          height: H_HEIGHT,
          fps: STREAM_FPS,
          bitratek: 4500,
        })
        job.process.on('exit', (code) => {
          if (streaming) {
            emitto('ms_dest_error', {
              id: dest.id,
              error: `egress exited ${code ?? '?'}`,
            })
          }
        })
        job.process.stderr?.on('data', (buf: Buffer) => {
          const text = buf.toString('utf8').trim()
          if (text) {
            emitto('ms_status', {
              status: `${dest.id}: ${text.slice(0, 120)}`,
            })
          }
        })
        rtmpjobs.set(dest.id, job)
      }
    } catch (err) {
      errors.push(
        `${dest.id}: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }
  if (rtmpjobs.size === 0 && !ertmpjob) {
    return {
      ok: false,
      error: errors.join('; ') || 'failed to start any destination',
    }
  }
  streaming = true
  emitto('ms_streaming', { streaming: true })
  if (errors.length) {
    emitto('ms_status', { status: errors.join('; ') })
  }
  return { ok: true }
}

function createmainwindow(): void {
  if (mainwin && !mainwin.isDestroyed()) {
    mainwin.show()
    mainwin.focus()
    return
  }
  mainwin = new BrowserWindow({
    width: MAIN_WINDOW_WIDTH,
    height: MAIN_WINDOW_HEIGHT,
    title: APP_NAME,
    backgroundColor: '#0000aa',
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  if (process.env.ELECTRON_RENDERER_URL) {
    void mainwin.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainwin.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
  mainwin.on('closed', () => {
    mainwin = null
  })
}

app.whenReady().then(() => {
  app.setName(APP_NAME)
  applyappicon()

  handleinvoke('resolve_ms_peer_id', (args) => {
    const override =
      String(args.overridepeerid || '').trim() ||
      String(
        process.env.MS_PEER_ID || process.env.MEDIASTREAM_PEER_ID || '',
      ).trim()
    return resolvemspeerid(msnetidfilepath(), override)
  })

  handleinvoke('copy_text', (args) => {
    clipboard.writeText(String(args.text || ''))
    return { ok: true }
  })

  handleinvoke('read_destinations', () => readdestinations())

  handleinvoke('write_destinations', (args) => {
    writedestinations(args.disk)
    return { ok: true }
  })

  handleinvoke('ffmpeg_path', () => ({ path: resolvefmpegpath() }))

  handleinvoke('start_egress', async () => startegressinternal())

  handleinvoke('stop_egress', () => {
    stopegressinternal()
    return { ok: true }
  })

  handleinvoke('write_text_file', (args) => {
    const filepath = String(args.path || '').trim()
    if (!filepath) {
      return { ok: false }
    }
    fs.mkdirSync(path.dirname(filepath), { recursive: true })
    fs.writeFileSync(filepath, String(args.text ?? ''), 'utf8')
    return { ok: true }
  })

  ipcMain.handle(
    'write_video_frame',
    (
      _event,
      args: {
        destid?: string
        rgba: ArrayBuffer
        width: number
        height: number
      },
    ) => {
      if (!streaming) {
        return { ok: false }
      }
      const buf = Buffer.from(args.rgba)
      const destid = String(args.destid || '').trim()
      if (destid && rtmpjobs.has(destid)) {
        const job = rtmpjobs.get(destid)
        try {
          job?.process.stdin?.write(buf)
          return { ok: true }
        } catch {
          return { ok: false }
        }
      }
      // Broadcast H frame to all custom RTMP jobs + twitch
      let wrote = false
      for (const job of rtmpjobs.values()) {
        try {
          job.process.stdin?.write(buf)
          wrote = true
        } catch {
          // isolated failure
        }
      }
      if (ertmpjob) {
        try {
          ertmpjob.process.stdin?.write(buf)
          wrote = true
        } catch {
          // isolated
        }
      }
      return { ok: wrote }
    },
  )

  createmainwindow()
})

app.on('window-all-closed', () => {
  stopegressinternal()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  createmainwindow()
})
