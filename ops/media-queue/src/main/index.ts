import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  BrowserWindow,
  app,
  clipboard,
  ipcMain,
  nativeImage,
  net,
  protocol,
} from 'electron'

import type { MQ_EMIT, MQ_INVOKE_COMMAND, MQ_INVOKE_MAP } from '../shared/ipc'

import { DownloadManager } from './lib/download'
import { resolvemqpeerid } from './lib/peerid'

const APP_NAME = 'Zed Cafe Media Queue'

const MAIN_WINDOW_WIDTH = 480

let mainwin: BrowserWindow | null = null
let windowchrome = 0
let downloads: DownloadManager | null = null
let mediacachedir = ''

function requiredownloads(): DownloadManager {
  if (!downloads) {
    throw new Error('downloads not ready')
  }
  return downloads
}

function mqnetidfilepath(): string {
  const override = String(process.env.MQ_NETID_FILE || '').trim()
  if (override) {
    return override
  }
  return path.join(app.getPath('userData'), 'mq-netid')
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

function resourceroot(): string {
  return app.isPackaged ? process.resourcesPath : app.getAppPath()
}

const emitto: MQ_EMIT = (event, payload) => {
  if (mainwin && !mainwin.isDestroyed()) {
    mainwin.webContents.send(event, payload)
  }
}

function mediapathallowed(requested: string): string {
  const trimmed = String(requested || '').trim()
  if (!path.isAbsolute(trimmed)) {
    throw new Error('path must be absolute')
  }
  const canonical = fs.realpathSync(trimmed)
  const cachecanonical = fs.realpathSync(mediacachedir)
  if (!canonical.startsWith(cachecanonical)) {
    throw new Error('path outside media cache')
  }
  if (!fs.statSync(canonical).isFile()) {
    throw new Error('not a file')
  }
  return canonical
}

function registermediaprotocol(): void {
  protocol.handle('mqmedia', async (request) => {
    try {
      const prefix = 'mqmedia://local/'
      if (!request.url.startsWith(prefix)) {
        return new Response('bad mqmedia url', { status: 400 })
      }
      const filepath = mediapathallowed(
        decodeURIComponent(request.url.slice(prefix.length)),
      )
      return net.fetch(pathToFileURL(filepath).toString())
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return new Response(message, { status: 403 })
    }
  })
}

function windowchromelogical(win: BrowserWindow): number {
  if (windowchrome > 0) {
    return windowchrome
  }
  const outer = win.getBounds().height
  const inner = win.getContentBounds().height
  windowchrome = Math.max(0, outer - inner)
  return windowchrome
}

function createmainwindow(): void {
  if (mainwin && !mainwin.isDestroyed()) {
    mainwin.show()
    mainwin.focus()
    return
  }
  mainwin = new BrowserWindow({
    width: MAIN_WINDOW_WIDTH,
    height: 464,
    useContentSize: true,
    resizable: false,
    maximizable: false,
    title: APP_NAME,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
    icon: iconpath(),
  })
  if (process.env.ELECTRON_RENDERER_URL) {
    void mainwin.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainwin.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'))
  }
  mainwin.on('closed', () => {
    mainwin = null
  })
}

/** Registers one invoke channel against the shared command map. */
function handleinvoke<K extends MQ_INVOKE_COMMAND>(
  cmd: K,
  oninvoke: (
    args: MQ_INVOKE_MAP[K]['args'],
  ) => MQ_INVOKE_MAP[K]['result'] | Promise<MQ_INVOKE_MAP[K]['result']>,
): void {
  ipcMain.handle(cmd, (_event, args: MQ_INVOKE_MAP[K]['args']) =>
    oninvoke(args),
  )
}

function wireipc(): void {
  handleinvoke('get_state', () => ({
    download: requiredownloads().readstate(),
    prep: requiredownloads().readprepstate(),
    cookiesBrowser: requiredownloads().readcookiesbrowser(),
  }))

  handleinvoke('copy_text', (args) => {
    const text = String((args && args.text) || '').trim()
    if (!text) {
      throw new Error('nothing to copy')
    }
    clipboard.writeText(text)
    return true
  })

  handleinvoke('resize_main_window', (args) => {
    if (!mainwin || mainwin.isDestroyed()) {
      throw new Error('main window missing')
    }
    const contentheight = Number(args && args.contentHeight)
    if (!Number.isFinite(contentheight) || contentheight < 1) {
      throw new Error('invalid content height')
    }
    const chrome = windowchromelogical(mainwin)
    mainwin.setContentSize(MAIN_WINDOW_WIDTH, Math.ceil(contentheight + chrome))
    return null
  })

  handleinvoke('set_media_cookies_browser', (args) => {
    requiredownloads().setcookiesbrowser(String((args && args.browser) || ''))
    return requiredownloads().readcookiesbrowser()
  })

  handleinvoke('start_media_download', async (args) => {
    const url = String((args && args.url) || '')
    return requiredownloads().startdownload(url, emitto)
  })

  handleinvoke('start_media_prep', async (args) => {
    const url = String((args && args.url) || '')
    return requiredownloads().startprep(url, emitto)
  })

  handleinvoke('cancel_media_download', () => {
    requiredownloads().canceldownload()
    return requiredownloads().readstate()
  })

  handleinvoke('cancel_media_prep', () => {
    requiredownloads().cancelprep()
    return requiredownloads().readprepstate()
  })

  handleinvoke('read_media_prep_state', () =>
    requiredownloads().readprepstate(),
  )

  handleinvoke('take_media_prep_ready', (args) => {
    const url = String((args && args.url) || '')
    return requiredownloads().takeprepready(url)
  })

  handleinvoke('prune_media_queue_cache', (args) => {
    const urls = args && Array.isArray(args.urls) ? args.urls : []
    const playingurl = String((args && args.playingUrl) || '')
    return requiredownloads().prunequeuecache(urls, playingurl)
  })

  handleinvoke('clear_media_downloads', () =>
    requiredownloads().cleardownloads(),
  )

  handleinvoke('get_media_download_state', () => requiredownloads().readstate())

  handleinvoke('read_media_file', (args) => {
    const requested = String((args && args.path) || '')
    const devpath = process.env.MQ_DEV_PLAYBACK_PATH
    if (devpath) {
      const trimmed = requested.trim()
      const canonical = fs.realpathSync(trimmed)
      const devcanonical = fs.realpathSync(devpath)
      if (canonical === devcanonical && fs.statSync(canonical).isFile()) {
        return fs.readFileSync(canonical)
      }
    }
    const allowed = mediapathallowed(requested)
    return fs.readFileSync(allowed)
  })

  handleinvoke('write_text_file', (args) => {
    const filepath = String((args && args.path) || '').trim()
    const text = String((args && args.text) ?? '')
    if (!filepath) {
      throw new Error('path required')
    }
    fs.mkdirSync(path.dirname(filepath), { recursive: true })
    fs.writeFileSync(filepath, text, 'utf8')
    return true
  })

  handleinvoke('resolve_mq_peer_id', () => {
    return resolvemqpeerid(mqnetidfilepath(), process.env.MQ_PEER_ID || '')
  })

  handleinvoke('get_mq_dev_config', () => ({
    peeridfile: process.env.MQ_PEER_ID_FILE || '',
    playbackpath: process.env.MQ_DEV_PLAYBACK_PATH || '',
    statustextfile: process.env.MQ_STATUS_TEXT_FILE || '',
  }))

  handleinvoke('mq_dev_peer_open', (args) => {
    const id = String((args && args.id) || '').trim()
    const filepath = process.env.MQ_PEER_ID_FILE
    if (!id || !filepath) {
      return false
    }
    fs.mkdirSync(path.dirname(filepath), { recursive: true })
    fs.writeFileSync(filepath, id, 'utf8')
    return true
  })

  handleinvoke('mq_dev_status', (args) => {
    const text = String((args && args.text) ?? '')
    const filepath = process.env.MQ_STATUS_TEXT_FILE
    if (!filepath) {
      return false
    }
    fs.mkdirSync(path.dirname(filepath), { recursive: true })
    fs.writeFileSync(filepath, text, 'utf8')
    return true
  })
}

if (!app) {
  console.error('electron.app is undefined')
  process.exit(1)
}

if (typeof app.setName === 'function') {
  app.setName(APP_NAME)
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'mqmedia',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
    },
  },
])

app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')

void app.whenReady().then(() => {
  applyappicon()
  // Electron accepts 'cache' at runtime; @types/electron omits it from PathName.
  mediacachedir = path.join(
    (app.getPath as (name: string) => string)('cache'),
    'media-queue',
  )
  registermediaprotocol()
  downloads = new DownloadManager(resourceroot(), mediacachedir)
  const cookiesbrowser = String(process.env.MQ_COOKIES_BROWSER || '')
    .trim()
    .toLowerCase()
  if (cookiesbrowser) {
    downloads.setcookiesbrowser(cookiesbrowser)
  }
  downloads.warmejscache()
  wireipc()
  createmainwindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  applyappicon()
  if (!mainwin) {
    createmainwindow()
  }
})

app.on('before-quit', () => {
  if (downloads) {
    downloads.canceldownload()
    downloads.cancelprep()
  }
})
