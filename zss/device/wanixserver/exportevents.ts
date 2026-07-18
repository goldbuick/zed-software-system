import {
  wanixclientexportready,
  wanixclientzedcafefilechange,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'

export type WanixExportEventKind = 'mount-ready' | 'content-ready'

export function postwanixexportmessage(
  event: WanixExportEventKind,
  taskrid: string,
) {
  wanixclientexportready(SOFTWARE, '', {
    taskrid,
    event,
  })
}

export function postzedcafefilechangemessage(
  taskrid?: string,
  paths?: string[],
) {
  const payload: { taskrid?: string; paths?: string[] } = {}
  if (taskrid) {
    payload.taskrid = taskrid
  }
  if (paths && paths.length > 0) {
    payload.paths = paths
  }
  wanixclientzedcafefilechange(
    SOFTWARE,
    '',
    Object.keys(payload).length > 0 ? payload : undefined,
  )
}
