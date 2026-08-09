'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('relay', {
  getState: () => ipcRenderer.invoke('get-state'),
  setYoutubeKey: (key) => ipcRenderer.invoke('set-youtube-key', key),
  regenerateBearer: () => ipcRenderer.invoke('regenerate-bearer'),
  start: () => ipcRenderer.invoke('start'),
  stop: () => ipcRenderer.invoke('stop'),
  copyBearer: () => ipcRenderer.invoke('copy-bearer'),
  openReleases: () => ipcRenderer.invoke('open-releases'),
  refreshLogs: () => ipcRenderer.invoke('refresh-logs'),
  resizeToContent: (width, height) =>
    ipcRenderer.invoke('resize-to-content', width, height),
  onState: (cb) => {
    const handler = (_e, state) => cb(state)
    ipcRenderer.on('state', handler)
    return () => ipcRenderer.removeListener('state', handler)
  },
})
