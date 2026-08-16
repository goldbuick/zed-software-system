'use strict'

const { contextBridge, ipcRenderer } = require('electron')

function listen(event, handler) {
  const wrapped = (_event, payload) => handler({ payload: payload })
  ipcRenderer.on(event, wrapped)
  return Promise.resolve(() => {
    ipcRenderer.removeListener(event, wrapped)
  })
}

contextBridge.exposeInMainWorld('__TAURI__', {
  core: {
    invoke: (cmd, args) => ipcRenderer.invoke(cmd, args || {}),
  },
  event: {
    listen: listen,
  },
})

contextBridge.exposeInMainWorld('mqdev', {
  peeridfile: process.env.MQ_PEER_ID_FILE || '',
  playbackpath: process.env.MQ_DEV_PLAYBACK_PATH || '',
  statustextfile: process.env.MQ_STATUS_TEXT_FILE || '',
  writetextfile: (filepath, text) =>
    ipcRenderer.invoke('write_text_file', { path: filepath, text: String(text ?? '') }),
})
