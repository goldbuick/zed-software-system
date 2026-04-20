import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  boardrunnerowned,
  registerboardrunnerask,
  vmlogout,
} from 'zss/device/api'
import { savestate } from 'zss/device/vm/helpers'
import { memorysyncrevokeboardrunner } from 'zss/device/vm/memorysync'
import {
  BOARDRUNNER_ACK_FAIL_COUNT,
  FLUSH_RATE,
  IDLE_LOGOUT_TRACKING,
  ackboardrunners,
  boardrunners,
  failedboardrunners,
  incflushtick,
  playerboardrunnerowntarget,
  setflushtick,
  tracking,
} from 'zss/device/vm/state'
import { doasync } from 'zss/mapping/func'
import { ispresent } from 'zss/mapping/types'
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

      // players whose owned-board assignment changed this second — emit one
      // refresh per player at the end of the loop below.
      const ownershipdirty = new Set<string>()

      const boards = Object.keys(boardrunners)
      for (let i = 0; i < boards.length; ++i) {
        const boardid = boards[i]
        const playerid = boardrunners[boardid]
        if (!ispresent(playerid)) {
          continue
        }
        if (ackboardrunners[boardid] === playerid) {
          continue
        }
        registerboardrunnerask(vm, playerid, boardid)
        failedboardrunners[boardid] ??= {}
        const prev = failedboardrunners[boardid][playerid] ?? 0
        const next = prev + 1
        failedboardrunners[boardid][playerid] = next
        if (next >= BOARDRUNNER_ACK_FAIL_COUNT) {
          // Player failed to ack in time. Revoke whoever was acked (including
          // the same playerid) so jsonsync admissions never orphan when maps
          // are cleared without a new ack flip.
          const prevack = ackboardrunners[boardid]
          if (typeof prevack === 'string' && prevack.length > 0) {
            memorysyncrevokeboardrunner(prevack, boardid)
            ownershipdirty.add(prevack)
          }
          delete boardrunners[boardid]
          delete ackboardrunners[boardid]
          // Block this (board, player) pair from re-election until peergone,
          // logout, successful ack, or board move clears it.
          failedboardrunners[boardid] ??= {}
          failedboardrunners[boardid][playerid] = BOARDRUNNER_ACK_FAIL_COUNT
          ownershipdirty.add(playerid)
        }
      }

      ownershipdirty.forEach((player) => {
        boardrunnerowned(vm, player, playerboardrunnerowntarget(player))
      })
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
