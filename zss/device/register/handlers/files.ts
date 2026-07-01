import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { apierror, apitoast, workstatus } from 'zss/device/api'
import { withclipboard } from 'zss/feature/keyboard'
import { storagesharecontent } from 'zss/feature/storage'
import { capturecurrentboardtopng } from 'zss/gadget/capture'
import { doasync } from 'zss/mapping/func'
import { isarray, ispresent, isstring } from 'zss/mapping/types'

export function handlecopy(device: DEVICE, message: MESSAGE): void {
  if (isstring(message.data)) {
    const clipboard = withclipboard()
    if (!ispresent(clipboard)) {
      apitoast(device, message.player, '$redclipboard not available')
      return
    }
    clipboard
      .writeText(message.data)
      .then(() =>
        apitoast(
          device,
          message.player,
          `copied! ${message.data.slice(0, 200)}`,
        ),
      )
      .catch((err) => {
        console.error(err)
        const msg =
          err instanceof Error ? err.message : 'clipboard write failed'
        apitoast(device, message.player, `$red${msg}`)
      })
  }
}

export function handledownloadjsonfile(device: DEVICE, message: MESSAGE): void {
  if (isarray(message.data)) {
    const [data, filename] = message.data as [any, string]
    try {
      const payload = JSON.stringify(
        {
          exported: filename,
          data,
        },
        null,
        2,
      )
      const islarge = payload.length > 64 * 1024
      if (islarge) {
        workstatus(device, message.player, 'export json')
      }
      const datablob = new Blob([payload], {
        type: 'application/json;charset=utf-8',
      })
      const dataurl = URL.createObjectURL(datablob)
      const anchor = document.createElement('a')
      anchor.href = dataurl
      anchor.download = filename
      anchor.click()
      URL.revokeObjectURL(dataurl)
    } catch (err: any) {
      apierror(device, message.player, 'downloadjsonfile', err?.message ?? err)
    }
  }
}

export function handledownloadbinaryfile(
  device: DEVICE,
  message: MESSAGE,
): void {
  if (isarray(message.data)) {
    const [bytes, filename, mimetype] = message.data as [
      Uint8Array,
      string,
      string,
    ]
    try {
      const copy = new Uint8Array(bytes)
      const datablob = new Blob([copy], {
        type: isstring(mimetype) ? mimetype : 'application/octet-stream',
      })
      const dataurl = URL.createObjectURL(datablob)
      const anchor = document.createElement('a')
      anchor.href = dataurl
      anchor.download = filename
      anchor.click()
      URL.revokeObjectURL(dataurl)
    } catch (err) {
      console.error(err)
    }
  }
}

export function handleshare(device: DEVICE, message: MESSAGE): void {
  doasync(device, message.player, async function () {
    await storagesharecontent(message.player)
  })
}

export function handlescreenshot(device: DEVICE, message: MESSAGE): void {
  workstatus(device, message.player, 'export png')
  capturecurrentboardtopng()
}
