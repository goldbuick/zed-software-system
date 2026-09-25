import { contextBridge, ipcRenderer } from 'electron'

import type {
  MS_BRIDGE,
  MS_DEV_BRIDGE,
  MS_EVENT_NAME,
  MS_INVOKE_COMMAND,
  MS_INVOKE_MAP,
} from '../shared/ipc'

function listen(
  event: MS_EVENT_NAME,
  handler: (message: { payload: unknown }) => void,
): Promise<() => void> {
  const wrapped = (_event: Electron.IpcRendererEvent, payload: unknown) =>
    handler({ payload })
  ipcRenderer.on(event, wrapped)
  return Promise.resolve(() => {
    ipcRenderer.removeListener(event, wrapped)
  })
}

function invoke<K extends MS_INVOKE_COMMAND>(
  cmd: K,
  args?: MS_INVOKE_MAP[K]['args'],
): Promise<MS_INVOKE_MAP[K]['result']> {
  return ipcRenderer.invoke(cmd, args || {})
}

const bridge: MS_BRIDGE = {
  core: {
    invoke,
  },
  event: {
    listen,
  },
}

contextBridge.exposeInMainWorld('ms', bridge)

const msdev: MS_DEV_BRIDGE = {
  peeridfile: process.env.MS_PEER_ID_FILE || '',
}

contextBridge.exposeInMainWorld('msdev', msdev)

contextBridge.exposeInMainWorld('msframe', {
  write: (payload: {
    destid?: string
    rgba: ArrayBuffer
    width: number
    height: number
  }) => ipcRenderer.invoke('write_video_frame', payload),
})
