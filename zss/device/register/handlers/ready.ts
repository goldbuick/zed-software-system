import type { DEVICE } from 'zss/device'
import { apilog, vmoperator } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { syncterminalbookmarkpins } from 'zss/device/register/helpers/bootstrap'
import { registerreadplayer } from 'zss/device/registerplayer'
import type { MESSAGE } from 'zss/device/types'
import { rundeeplinks } from 'zss/feature/deeplinkrun'
import { isclimode } from 'zss/feature/detect'
import {
  storagereadhistorybuffer,
  storagewatchcontent,
} from 'zss/feature/storage'
import { hydratetapelayoutby } from 'zss/feature/tapelayout'
import { useTerminal } from 'zss/gadget/data/zustandstores'
import { waitfor } from 'zss/mapping/tick'
import { ispresent } from 'zss/mapping/types'

export function handleready(device: DEVICE, message: MESSAGE): void {
  doasync(device, message.player, async () => {
    storagewatchcontent(registerreadplayer())
    const historybuffer = await storagereadhistorybuffer()
    if (ispresent(historybuffer)) {
      useTerminal.setState({
        buffer: historybuffer.filter((line: string) => {
          return line.includes('#broadcast') === false
        }),
      })
    }
    await hydratetapelayoutby()
    await syncterminalbookmarkpins()
    await waitfor(256)
    apilog(device, registerreadplayer(), `player ${registerreadplayer()}`)
    vmoperator(device, registerreadplayer())
    if (!isclimode()) {
      await waitfor(512)
      await rundeeplinks({
        player: registerreadplayer(),
        surface: 'boot',
        openterminal: true,
        device,
      })
    }
  })
}
