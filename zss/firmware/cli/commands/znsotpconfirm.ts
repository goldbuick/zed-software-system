import { SOFTWARE } from 'zss/device/session'
import { znslogincode, znspersistlogin } from 'zss/feature/url'
import { write } from 'zss/feature/writeui'
import { zsstextline } from 'zss/feature/zsstextui'

/** OTP confirm for ZNS deeplink — no deeplink/znsmenu imports (acyclic leaf). */
export async function znsconfirmotpfromdeeplink(
  player: string,
  email: string,
  code: string,
  namespace: string,
): Promise<boolean> {
  write(SOFTWARE, player, zsstextline(`confirming login with $green${code}`))
  const result = await znslogincode(email, code)
  if (result.success && result.token) {
    await znspersistlogin(email, namespace, result.token)
    return true
  }
  write(
    SOFTWARE,
    player,
    zsstextline(`$red zns login failed: ${result.message ?? 'unknown error'}`),
  )
  return false
}
