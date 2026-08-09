import { registerterminalopen, vmcli } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import {
  AIRSHARE_RECEIVE_PARAM,
  readairsharereceivefromurl,
} from 'zss/feature/airshare/bytes'
import {
  type DEEPLINK_CONTEXT,
  type DEEPLINK_HANDLER,
  registerdeeplink,
} from 'zss/feature/deeplinkregistry'

const airsharereceivehandler: DEEPLINK_HANDLER = {
  id: 'airshare-receive',
  paramkeys: [AIRSHARE_RECEIVE_PARAM],
  match() {
    return readairsharereceivefromurl()
  },
  readdata() {
    return readairsharereceivefromurl()
  },
  fingerprint() {
    return 'receive'
  },
  async run(ctx: DEEPLINK_CONTEXT) {
    const device = ctx.device ?? SOFTWARE
    if (ctx.openterminal) {
      registerterminalopen(device, ctx.player)
    }
    vmcli(device, ctx.player, '#airshare receive')
    return true
  },
}

export function registerairsharereceivedeeplink() {
  registerdeeplink(airsharereceivehandler)
}
