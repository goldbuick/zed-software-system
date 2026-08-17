import { contextBridge, ipcRenderer } from 'electron'

import type {
  MQ_BRIDGE,
  MQ_DEV_BRIDGE,
  MQ_EVENT_NAME,
  MQ_INVOKE_COMMAND,
  MQ_INVOKE_MAP,
} from '../shared/ipc'

function listen(
  event: MQ_EVENT_NAME,
  handler: (message: { payload: unknown }) => void,
): Promise<() => void> {
  const wrapped = (_event: Electron.IpcRendererEvent, payload: unknown) =>
    handler({ payload })
  ipcRenderer.on(event, wrapped)
  return Promise.resolve(() => {
    ipcRenderer.removeListener(event, wrapped)
  })
}

function invoke<K extends MQ_INVOKE_COMMAND>(
  cmd: K,
  args?: MQ_INVOKE_MAP[K]['args'],
): Promise<MQ_INVOKE_MAP[K]['result']> {
  return ipcRenderer.invoke(cmd, args || {})
}

const bridge: MQ_BRIDGE = {
  core: {
    invoke,
  },
  event: {
    listen,
  },
}

contextBridge.exposeInMainWorld('__TAURI__', bridge)

const mqdev: MQ_DEV_BRIDGE = {
  peeridfile: process.env.MQ_PEER_ID_FILE || '',
  playbackpath: process.env.MQ_DEV_PLAYBACK_PATH || '',
  statustextfile: process.env.MQ_STATUS_TEXT_FILE || '',
  writetextfile: (filepath, text) =>
    ipcRenderer.invoke('write_text_file', {
      path: filepath,
      text: String(text ?? ''),
    }),
}

contextBridge.exposeInMainWorld('mqdev', mqdev)
