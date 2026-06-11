import { registerterminalfull, vmcli } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import {
  type DEEPLINK_CONTEXT,
  type DEEPLINK_HANDLER,
  registerdeeplink,
} from 'zss/feature/deeplink'
import {
  ZNS_LOGIN_CODE_PARAM,
  ZNS_LOGIN_EMAIL_PARAM,
  ZNS_LOGIN_NAMESPACE_PARAM,
  type ZNS_LOGIN_URL_PARAMS,
  readznsloginparamsfromurl,
} from 'zss/feature/url'
import { ispresent } from 'zss/mapping/types'

const znsloginhandler: DEEPLINK_HANDLER = {
  id: 'zns-login',
  paramkeys: [
    ZNS_LOGIN_CODE_PARAM,
    ZNS_LOGIN_EMAIL_PARAM,
    ZNS_LOGIN_NAMESPACE_PARAM,
  ],
  match() {
    return ispresent(readznsloginparamsfromurl())
  },
  readdata() {
    return readznsloginparamsfromurl()
  },
  fingerprint(data) {
    return (data as ZNS_LOGIN_URL_PARAMS | undefined)?.code ?? ''
  },
  async run(ctx: DEEPLINK_CONTEXT, data: unknown) {
    const params = data as ZNS_LOGIN_URL_PARAMS | undefined
    if (!params?.code) {
      return false
    }
    const device = ctx.device ?? SOFTWARE
    if (ctx.openterminal) {
      registerterminalfull(device, ctx.player)
    }
    if (params.email && params.namespace) {
      const { znsconfirmotpfromdeeplink } =
        await import('zss/firmware/cli/commands/znsmenu')
      return znsconfirmotpfromdeeplink(
        ctx.player,
        params.email,
        params.code,
        params.namespace,
      )
    }
    vmcli(device, ctx.player, `#zns ${params.code}`)
    return true
  },
}

export function registerznslogindeeplink() {
  registerdeeplink(znsloginhandler)
}
