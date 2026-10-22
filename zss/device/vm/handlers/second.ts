import type { DEVICE } from 'zss/device'
import { bridgesessionlisttoken, vmlogout } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import type { MESSAGE } from 'zss/device/types'
import { savestate } from 'zss/device/vm/helpers'
import { maybeemitplayerchatroster } from 'zss/device/vm/playerchatroster'
import {
  FLUSH_RATE,
  SECOND_TIMEOUT,
  incflushtick,
  readsentsessionlisttoken,
  setflushtick,
  setsentsessionlisttoken,
  tracking,
} from 'zss/device/vm/state'
import { issessionlistpeerid } from 'zss/feature/sessionlist/protocol'
import { memoryscanplayers } from 'zss/memory/playermanagement'
import {
  memoryreadfrozen,
  memoryreadmainbook,
  memoryreadoperator,
} from 'zss/memory/session'
import { perfmeasure } from 'zss/perf/ui'

export function handlesecond(vm: DEVICE, message: MESSAGE): void {
  perfmeasure('vm:second', () => {
    memoryscanplayers(tracking)

    if (!memoryreadfrozen()) {
      const players = Object.keys(tracking)
      for (let i = 0; i < players.length; ++i) {
        ++tracking[players[i]]
      }
      for (let i = 0; i < players.length; ++i) {
        const player = players[i]
        if (tracking[player] >= SECOND_TIMEOUT) {
          vmlogout(vm, player)
        }
      }
    }

    maybeemitplayerchatroster(vm, message.player)

    const operator = memoryreadoperator()
    const token = memoryreadmainbook()?.token
    if (
      operator &&
      issessionlistpeerid(token) &&
      token !== readsentsessionlisttoken()
    ) {
      setsentsessionlisttoken(token)
      bridgesessionlisttoken(vm, operator, token)
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
