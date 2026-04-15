import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { apilog, vmlogout } from 'zss/device/api'
import { savestate } from 'zss/device/vm/helpers'
import {
  FLUSH_RATE,
  SECOND_TIMEOUT,
  boardrunnerbyboardid,
  incflushtick,
  setflushtick,
  tracking,
} from 'zss/device/vm/state'
import { doasync } from 'zss/mapping/func'
import {
  memoryreadboardrunnerbyboard,
  memoryscanplayers,
} from 'zss/memory/playermanagement'
import {
  memoryreadbookbysoftware,
  memoryreadoperator,
  memoryreadsimfreeze,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { perfmeasure } from 'zss/perf/ui'

export function handlesecond(vm: DEVICE, message: MESSAGE): void {
  perfmeasure('vm:second', () => {
    memoryscanplayers(tracking)

    if (!memoryreadsimfreeze()) {
      const players = Object.keys(tracking)
      for (let i = 0; i < players.length; ++i) {
        ++tracking[players[i]]
      }
      for (let i = 0; i < players.length; ++i) {
        const player = players[i]
        if (tracking[player] >= SECOND_TIMEOUT) {
          vmlogout(vm, player, false)
        }
      }
    }

    // Board runner election: same `tracking` as DOOT idle (incremented above when sim is unfrozen).
    const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    const selection = memoryreadboardrunnerbyboard(mainbook, tracking)
    for (const k of Object.keys(boardrunnerbyboardid)) {
      delete boardrunnerbyboardid[k]
    }
    Object.assign(boardrunnerbyboardid, selection)
    const operator = memoryreadoperator()
    if (operator) {
      const parts = Object.keys(selection)
        .sort()
        .map((bid) => `${bid}=${selection[bid]}`)
      if (parts.length > 0) {
        apilog(vm, operator, `boardrunner ${parts.join(' ')}`)
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
