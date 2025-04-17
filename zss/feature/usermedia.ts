import { api_error } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { MAYBE } from 'zss/mapping/types'

// screenshare
export async function getusersharestream(
  player: string,
): Promise<MAYBE<MediaStream>> {
  try {
    return await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true,
    })
  } catch (err: any) {
    api_error(SOFTWARE, player, 'usershare', err.toString())
  }
  return undefined
}
