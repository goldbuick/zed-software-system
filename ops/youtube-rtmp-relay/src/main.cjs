'use strict'

const electron = require('electron')
const path = require('node:path')
const {
  getconfig,
  setyoutubekey,
  regenerateverbearer,
  settlstrusted,
  ensurebearer,
  setuserdata: setconfiguserdata,
} = require('./lib/config.cjs')
const {
  ensureservercerts,
  installtrust,
  setuserdata: settlsuserdata,
} = require('./lib/tls.cjs')
const {
  setexpectedbearer,
  startauthserver,
  stopauthserver,
} = require('./lib/authserver.cjs')
const mediamtx = require('./lib/mediamtx.cjs')
const { WHIP_URL, RELEASES_URL } = require('./lib/constants.cjs')

const { app, BrowserWindow, Tray, Menu, nativeImage, shell, ipcMain, clipboard } =
  electron

let tray
let settingswin
let status = 'idle'
let statusdetail = ''

function iconpath() {
  return path.join(__dirname, '..', 'resources', 'icons', 'icon.png')
}

function setstatus(next, detail = '') {
  status = next
  statusdetail = detail
  broadcaststate()
  rebuildtraymenu()
}

function getstate() {
  const cfg = getconfig()
  return {
    status,
    statusdetail,
    youtubeStreamKey: cfg.youtubeStreamKey,
    localBearer: cfg.localBearer,
    whipUrl: WHIP_URL,
    tlsTrusted: cfg.tlsTrusted,
    running: mediamtx.isrunning(),
    logs: mediamtx.getlogs().slice(-40),
    releasesUrl: RELEASES_URL,
  }
}

function broadcaststate() {
  if (settingswin && !settingswin.isDestroyed()) {
    settingswin.webContents.send('state', getstate())
  }
}

function opensettings() {
  if (settingswin && !settingswin.isDestroyed()) {
    settingswin.show()
    settingswin.focus()
    return
  }
  settingswin = new BrowserWindow({
    width: 480,
    height: 400,
    useContentSize: true,
    resizable: false,
    maximizable: false,
    title: 'zed.cafe YouTube relay',
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: iconpath(),
  })
  settingswin.loadFile(path.join(__dirname, 'renderer', 'index.html'))
  settingswin.on('closed', () => {
    settingswin = undefined
  })
}

async function startrelay() {
  try {
    const cfg = getconfig()
    ensurebearer()
    setexpectedbearer(cfg.localBearer)
    await startauthserver()
    const certpaths = ensureservercerts()
    if (!cfg.tlsTrusted) {
      const ok = installtrust(certpaths.cert)
      settlstrusted(ok)
      if (!ok) {
        setstatus(
          'error',
          'Could not auto-trust TLS cert. Trust server.crt in Settings help, then retry.',
        )
      }
    }
    await mediamtx.start({
      certpaths,
      youtubeStreamKey: cfg.youtubeStreamKey,
    })
    setstatus('listening', 'Waiting for cafe WHIP publish')
  } catch (err) {
    setstatus('error', err.message || String(err))
    throw err
  }
}

async function stoprelay() {
  await mediamtx.stop()
  setstatus('idle', '')
}

function rebuildtraymenu() {
  if (!tray) {
    return
  }
  const running = mediamtx.isrunning()
  const menu = Menu.buildFromTemplate([
    {
      label: running ? 'Stop relay' : 'Start relay',
      click: () => {
        void (running ? stoprelay() : startrelay()).catch(() => {})
      },
    },
    { label: 'Open settings', click: () => opensettings() },
    {
      label: 'Copy local bearer',
      click: () => clipboard.writeText(getconfig().localBearer),
    },
    {
      label: 'Download / releases',
      click: () => shell.openExternal(RELEASES_URL),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: async () => {
        await stoprelay()
        await stopauthserver()
        app.quit()
      },
    },
  ])
  tray.setContextMenu(menu)
  tray.setToolTip(`zed.cafe YouTube relay (${status})`)
}

function wireipc() {
  ipcMain.handle('get-state', () => getstate())
  ipcMain.handle('set-youtube-key', (_e, key) => {
    setyoutubekey(key)
    return getstate()
  })
  ipcMain.handle('regenerate-bearer', () => {
    regenerateverbearer()
    setexpectedbearer(getconfig().localBearer)
    return getstate()
  })
  ipcMain.handle('start', async () => {
    await startrelay()
    return getstate()
  })
  ipcMain.handle('stop', async () => {
    await stoprelay()
    return getstate()
  })
  ipcMain.handle('copy-bearer', () => {
    clipboard.writeText(getconfig().localBearer)
    return true
  })
  ipcMain.handle('open-releases', () => {
    shell.openExternal(RELEASES_URL)
    return true
  })
  ipcMain.handle('refresh-logs', () => getstate())
  ipcMain.handle('resize-to-content', (_e, width, height) => {
    if (!settingswin || settingswin.isDestroyed()) {
      return false
    }
    const w = Math.ceil(Number(width) || 0)
    const h = Math.ceil(Number(height) || 0)
    if (w < 1 || h < 1) {
      return false
    }
    settingswin.setContentSize(w, h)
    return true
  })
}

if (!app) {
  console.error(
    'electron.app is undefined - run with: yarn start (electron .), not node',
  )
  process.exit(1)
}

app.whenReady().then(() => {
  const userdata = app.getPath('userData')
  setconfiguserdata(userdata)
  settlsuserdata(userdata)
  mediamtx.setpaths({
    apppath: app.getAppPath(),
    userdata,
    packaged: app.isPackaged,
  })

  ensurebearer()
  setexpectedbearer(getconfig().localBearer)
  wireipc()

  const image = nativeImage.createFromPath(iconpath())
  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image)
  rebuildtraymenu()
  opensettings()

  setInterval(() => {
    if (mediamtx.isrunning() && status === 'listening') {
      const logs = mediamtx.getlogs().join('\n')
      if (/runOnReady command started/i.test(logs)) {
        setstatus('pushing', 'Pushing to YouTube')
      }
    }
    if (
      !mediamtx.isrunning() &&
      (status === 'listening' || status === 'pushing')
    ) {
      setstatus('idle', 'MediaMTX stopped')
    }
    broadcaststate()
  }, 1500)
})

app.on('window-all-closed', () => {
  // Keep tray process alive when settings window closes.
})

app.on('before-quit', () => {
  void stoprelay()
  void stopauthserver()
})
