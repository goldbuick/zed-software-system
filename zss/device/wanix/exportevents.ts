import { WANIX_MSG_EXPORT } from 'zss/feature/wanix/wanixrpcmessages'

export type WanixExportEventKind = 'mount-ready' | 'content-ready'

export function postwanixexportmessage(
  event: WanixExportEventKind,
  taskrid: string,
  extra?: Record<string, unknown>,
) {
  window.parent.postMessage(
    {
      type: WANIX_MSG_EXPORT,
      event,
      taskrid,
      ...extra,
    },
    window.location.origin,
  )
}
