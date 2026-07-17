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

export function postzedcafefilechangemessage(taskrid?: string) {
  wanixclientzedcafefilechange(SOFTWARE, '', taskrid ? { taskrid } : undefined)
}
