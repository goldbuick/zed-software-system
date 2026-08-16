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
