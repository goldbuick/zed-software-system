import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  bridgejoin,
  registerterminalclose,
  registerterminalfull,
  vmcli,
  vmgadgetdesync,
  vmloader,
  vmlogin,
  vmzsswords,
} from 'zss/device/api'
import {
  loadmem,
  writeclilink,
  writehelphint,
  writepages,
} from 'zss/device/register/helpers/bootstrap'
import { setloggedin } from 'zss/device/register/state'
import { registerreadplayer } from 'zss/device/registerplayer'
import { ZSS_BOOKMARKS_KEY } from 'zss/feature/bookmarks'
import { rundeeplinks } from 'zss/feature/deeplink'
import { isclimode } from 'zss/feature/detect'
import { getfingerprint } from 'zss/feature/fingerprint'
import {
  storagereadconfigall,
  storagereadcontent,
  storagereadvars,
} from 'zss/feature/storage'
import { restorettsenginefromstorage } from 'zss/feature/tts'
import { isjoin } from 'zss/feature/url'
import { GADGET_ZSS_WORDS } from 'zss/gadget/data/types'
import { useGadgetClient } from 'zss/gadget/data/zustandstores'
import { doasync } from 'zss/device/doasync'
import { ispresent, isstring } from 'zss/mapping/types'

export function handlesessionreset(device: DEVICE, message: MESSAGE): void {
  void device
  void message
  setloggedin(false)
}

export function handleackoperator(device: DEVICE, message: MESSAGE): void {
  vmgadgetdesync(device, registerreadplayer())
  doasync(device, message.player, async () => {
    const urlcontent = await storagereadcontent(registerreadplayer())
    if (isjoin() && isstring(urlcontent)) {
      bridgejoin(device, registerreadplayer(), urlcontent)
    } else {
      await loadmem(device, urlcontent)
    }
  })
}

export function handleloginready(device: DEVICE, message: MESSAGE): void {
  doasync(device, message.player, async () => {
    await restorettsenginefromstorage()
    const storage = await storagereadvars()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [ZSS_BOOKMARKS_KEY]: _bookmarks, ...storageforlogin } = storage
    const config = await storagereadconfigall()
    const token = await getfingerprint()
    vmlogin(device, registerreadplayer(), {
      ...storageforlogin,
      config,
      token,
    })
    vmzsswords(device, registerreadplayer())
  })
}

export function handleacklogin(device: DEVICE, message: MESSAGE): void {
  if (message.data) {
    setloggedin(true)
    registerterminalclose(device, registerreadplayer())
    vmloader(device, message.player, undefined, 'text', 'sim:load', '')
    if (!isclimode()) {
      doasync(device, registerreadplayer(), async () => {
        await rundeeplinks({
          player: registerreadplayer(),
          surface: 'boot',
          openterminal: true,
          device,
        })
      })
    }
    if (isclimode()) {
      vmcli(device, registerreadplayer(), '#joincode')
    }
  } else {
    setloggedin(false)
    doasync(device, message.player, async () => {
      await writeclilink(device)
      writepages(device)
      registerterminalfull(device, registerreadplayer())
      vmloader(device, message.player, undefined, 'text', 'sim:load', '')
      await writehelphint(device)
    })
  }
}

export function handleackzsswords(_device: DEVICE, message: MESSAGE): void {
  if (ispresent(message.data)) {
    useGadgetClient.setState({
      zsswords: message.data as GADGET_ZSS_WORDS,
    })
  }
}
