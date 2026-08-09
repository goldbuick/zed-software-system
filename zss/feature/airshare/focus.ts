import {
  registerterminalclose,
} from 'zss/device/api'
import type { DEVICELIKE } from 'zss/device/types'
import { mobiletextblur } from 'zss/gadget/mobiletext'

/** Dismiss soft keyboard / CLI capture when airshare UI opens. */
export function airshareclearfocus(device: DEVICELIKE, player: string) {
  mobiletextblur()
  registerterminalclose(device, player)
}
