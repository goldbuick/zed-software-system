import type { DEVICE } from 'zss/device'
import { apierror } from 'zss/device/api'
import type { MESSAGE } from 'zss/device/messagetypes'
import { wanixhandleexportstate } from 'zss/device/wanixclient/wanixzedcafe'
import type { WANIX_ZED_CAFE_EXPORT_FILE } from 'zss/feature/wanix/wanixstateexport'
import { ispresent } from 'zss/mapping/types'

type WANIX_EXPORT_STATE_PAYLOAD = {
  files: WANIX_ZED_CAFE_EXPORT_FILE[]
}

function readwanixexportstatepayload(
  data: unknown,
): WANIX_EXPORT_STATE_PAYLOAD | undefined {
  if (!ispresent(data) || typeof data !== 'object') {
    return undefined
  }
  const payload = data as WANIX_EXPORT_STATE_PAYLOAD
  if (!Array.isArray(payload.files)) {
    return undefined
  }
  for (let i = 0; i < payload.files.length; ++i) {
    const file = payload.files[i]
    if (!ispresent(file) || typeof file.path !== 'string') {
      return undefined
    }
    if (file.bytes instanceof Uint8Array) {
      continue
    }
    if (Array.isArray(file.bytes)) {
      file.bytes = new Uint8Array(file.bytes as number[])
      continue
    }
    return undefined
  }
  return payload
}

export function handleexportstate(device: DEVICE, message: MESSAGE): void {
  const payload = readwanixexportstatepayload(message.data)
  if (!payload) {
    apierror(
      device,
      message.player,
      'wanix',
      'zedcafe exportstate payload rejected',
    )
    return
  }
  wanixhandleexportstate(device, message.player, payload.files)
}
