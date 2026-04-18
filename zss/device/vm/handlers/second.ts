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
  SECOND_TIMEOUT,
  ackboardrunners,
  boardrunners,
  failedboardrunners,
  incflushtick,
  setflushtick,
  tracking,
} from 'zss/device/vm/state'
import { doasync } from 'zss/mapping/func'
import { ispresent } from 'zss/mapping/types'
import { memoryscanplayers } from 'zss/memory/playermanagement'
import { memoryreadsimfreeze } from 'zss/memory/session'
import { perfmeasure } from 'zss/perf/ui'

function playerownedboards(player: string): string[] {
  const result: string[] = []
  const boards = Object.keys(ackboardrunners)
  for (let i = 0; i < boards.length; ++i) {
    if (ackboardrunners[boards[i]] === player) {
      result.push(boards[i])
    }
  }
  return result
}

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

      // players whose ownership set changed this second, emit one refresh
      // per player at the end of the loop below.
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
          // Player failed to ack in time. If a different player was previously
          // the acked runner, revoke their admission so they do not keep
          // ticking the board. The next tick's election will pick a new
          // candidate from the remaining eligible players.
          const prevack = ackboardrunners[boardid]
          if (
            typeof prevack === 'string' &&
            prevack.length > 0 &&
            prevack !== playerid
          ) {
            memorysyncrevokeboardrunner(prevack, boardid)
            ownershipdirty.add(prevack)
          }
          delete boardrunners[boardid]
          delete ackboardrunners[boardid]
        }
      }

      ownershipdirty.forEach((player) => {
        boardrunnerowned(vm, player, playerownedboards(player))
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
