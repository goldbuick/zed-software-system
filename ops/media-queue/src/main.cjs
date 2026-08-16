'use strict'

const electron = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { DownloadManager } = require('./lib/download.cjs')
const { resolvemqpeerid } = require('./lib/peerid.cjs')

const { app, BrowserWindow, ipcMain, clipboard, protocol, net } = electron

const APP_NAME = 'Zed Cafe Media Queue'

const MAIN_WINDOW_WIDTH = 480

let mainwin = null
let windowchrome = 0
let downloads = null
let mediacachedir = ''

function mqnetidfilepath() {
  const override = String(process.env.MQ_NETID_FILE || '').trim()
  if (override) {
    return override
  }
  return path.join(app.getPath('userData'), 'mq-netid')
}

function iconpath() {
  const icns = path.join(__dirname, '..', 'resources', 'icons', 'icon.icns')
  if (process.platform === 'darwin' && fs.existsSync(icns)) {
    return icns
  }
  return path.join(__dirname, '..', 'resources', 'icons', 'icon.png')
}

function applyappicon() {
  const iconfile = iconpath()
  if (!fs.existsSync(iconfile)) {
    return
  }
  const image = electron.nativeImage.createFromPath(iconfile)
  if (image.isEmpty()) {
    return
  }
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(image)
  }
}

function resourceroot() {
  return app.isPackaged ? process.resourcesPath : app.getAppPath()
}

function emitto(event, payload) {
  if (mainwin && !mainwin.isDestroyed()) {
    mainwin.webContents.send(event, payload)
  }
}

function mediapathallowed(requested) {
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

function registermediaprotocol() {
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

function windowchromelogical(win) {
  if (windowchrome > 0) {
    return windowchrome
  }
  const outer = win.getBounds().height
  const inner = win.getContentBounds().height
  windowchrome = Math.max(0, outer - inner)
  return windowchrome
}

function createmainwindow() {
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
    backgroundThrottling: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: iconpath(),
  })
  mainwin.loadFile(path.join(__dirname, '..', 'ui', 'index.html'))
  mainwin.on('closed', () => {
    mainwin = null
  })
}

function wireipc() {
  ipcMain.handle('get_state', () => ({
    download: downloads.readstate(),
    prep: downloads.readprepstate(),
    cookiesBrowser: downloads.readcookiesbrowser(),
  }))

  ipcMain.handle('copy_text', (_event, args) => {
    const text = String((args && args.text) || '').trim()
    if (!text) {
      throw new Error('nothing to copy')
    }
    clipboard.writeText(text)
    return true
  })

  ipcMain.handle('resize_main_window', (_event, args) => {
    if (!mainwin || mainwin.isDestroyed()) {
      throw new Error('main window missing')
    }
    const contentheight = Number(args && args.contentHeight)
    if (!Number.isFinite(contentheight) || contentheight < 1) {
      throw new Error('invalid content height')
    }
    const chrome = windowchromelogical(mainwin)
    mainwin.setContentSize(
      MAIN_WINDOW_WIDTH,
      Math.ceil(contentheight + chrome),
    )
    return null
  })

  ipcMain.handle('set_media_cookies_browser', (_event, args) => {
    downloads.setcookiesbrowser(String((args && args.browser) || ''))
    return downloads.readcookiesbrowser()
  })

  ipcMain.handle('start_media_download', async (_event, args) => {
    const url = String((args && args.url) || '')
    return downloads.startdownload(url, emitto)
  })

  ipcMain.handle('start_media_prep', async (_event, args) => {
    const url = String((args && args.url) || '')
    return downloads.startprep(url, emitto)
  })

  ipcMain.handle('cancel_media_download', () => {
    downloads.canceldownload()
    return downloads.readstate()
  })

  ipcMain.handle('cancel_media_prep', () => {
    downloads.cancelprep()
    return downloads.readprepstate()
  })

  ipcMain.handle('read_media_prep_state', () => downloads.readprepstate())

  ipcMain.handle('take_media_prep_ready', (_event, args) => {
    const url = String((args && args.url) || '')
    return downloads.takeprepready(url)
  })

  ipcMain.handle('prune_media_queue_cache', (_event, args) => {
    const urls = args && Array.isArray(args.urls) ? args.urls : []
    const playingurl = String((args && args.playingUrl) || '')
    return downloads.prunequeuecache(urls, playingurl)
  })

  ipcMain.handle('clear_media_downloads', () => downloads.cleardownloads())

  ipcMain.handle('get_media_download_state', () => downloads.readstate())

  ipcMain.handle('read_media_file', (_event, args) => {
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

  ipcMain.handle('write_text_file', (_event, args) => {
    const filepath = String((args && args.path) || '').trim()
    const text = String((args && args.text) ?? '')
    if (!filepath) {
      throw new Error('path required')
    }
    fs.mkdirSync(path.dirname(filepath), { recursive: true })
    fs.writeFileSync(filepath, text, 'utf8')
    return true
  })

  ipcMain.handle('resolve_mq_peer_id', () => {
    return resolvemqpeerid(
      mqnetidfilepath(),
      process.env.MQ_PEER_ID || '',
    )
  })

  ipcMain.handle('get_mq_dev_config', () => ({
    peeridfile: process.env.MQ_PEER_ID_FILE || '',
    playbackpath: process.env.MQ_DEV_PLAYBACK_PATH || '',
    statustextfile: process.env.MQ_STATUS_TEXT_FILE || '',
  }))

  ipcMain.handle('mq_dev_peer_open', (_event, args) => {
    const id = String((args && args.id) || '').trim()
    const filepath = process.env.MQ_PEER_ID_FILE
    if (!id || !filepath) {
      return false
    }
    fs.mkdirSync(path.dirname(filepath), { recursive: true })
    fs.writeFileSync(filepath, id, 'utf8')
    return true
  })

  ipcMain.handle('mq_dev_status', (_event, args) => {
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

app.whenReady().then(() => {
  applyappicon()
  mediacachedir = path.join(app.getPath('cache'), 'media-queue')
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
