import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { apilog, boardrunnerstart, vmoperator } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { syncterminalbookmarkpins } from 'zss/device/register/helpers/bootstrap'
import { registerreadplayer } from 'zss/device/registerplayer'
import { rundeeplinks } from 'zss/feature/deeplink'
import { isclimode } from 'zss/feature/detect'
import {
  storagereadhistorybuffer,
  storagewatchcontent,
} from 'zss/feature/storage'
import { useTerminal } from 'zss/gadget/data/zustandstores'
import { waitfor } from 'zss/mapping/tick'
import { ispresent } from 'zss/mapping/types'

export function handleready(device: DEVICE, message: MESSAGE): void {
  doasync(device, message.player, async () => {
    boardrunnerstart(device, registerreadplayer())
    storagewatchcontent(registerreadplayer())
    const historybuffer = await storagereadhistorybuffer()
    if (ispresent(historybuffer)) {
      useTerminal.setState({
        buffer: historybuffer.filter((line: string) => {
          return line.includes('#broadcast') === false
        }),
      })
    }
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
