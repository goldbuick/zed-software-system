import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { vmlogout } from 'zss/device/api'
import { savestate } from 'zss/device/vm/helpers'
import {
  FLUSH_RATE,
  IDLE_LOGOUT_TRACKING,
  incflushtick,
  setflushtick,
  tracking,
} from 'zss/device/vm/state'
import { doasync } from 'zss/mapping/func'
import { memoryscanplayers } from 'zss/memory/playermanagement'
import { memoryreadfreeze } from 'zss/memory/session'
import { perfmeasure } from 'zss/perf/ui'

export function handlesecond(vm: DEVICE, message: MESSAGE): void {
  perfmeasure('vm:second', () => {
    memoryscanplayers(tracking)

    if (!memoryreadfreeze()) {
      const players = Object.keys(tracking)
      for (let i = 0; i < players.length; ++i) {
        ++tracking[players[i]]
      }
      for (let i = 0; i < players.length; ++i) {
        const player = players[i]
        if (tracking[player] >= IDLE_LOGOUT_TRACKING) {
          vmlogout(vm, player, false)
        }
      }
    }

    const flushtick = incflushtick()
    if (flushtick >= FLUSH_RATE) {
      setflushtick(0)
      doasync(vm, message.player, async () => {
        await savestate(vm, true)
      })
    }
  })
}
