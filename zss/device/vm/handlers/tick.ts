import type { DEVICE } from 'zss/device'
import {
  type MESSAGE,
  boardrunnerowned,
  boardrunnertick,
  registerboardrunnerask,
} from 'zss/device/api'
import {
  memorysyncpushdirty,
  memorysyncrevokeboardrunner,
} from 'zss/device/vm/memorysync'
import {
  BOARDRUNNER_ACKTICK_STALE_MS,
  ackboardrunners,
  boardrunnerlastacktickat,
  boardrunners,
  clearboardrunnerlastacktick,
  failedboardrunners,
  playerboardrunnerowntarget,
  tracking,
} from 'zss/device/vm/state'
import { ispresent, isstring } from 'zss/mapping/types'
import {
  boardrunnerackeligible,
  memoryreadboardrunnerchoices,
  memoryscanplayers,
} from 'zss/memory/playermanagement'
import { memorytickloaders } from 'zss/memory/runtime'
import {
  memoryreadbookbysoftware,
  memoryreadfreeze,
  memoryreadoperator,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { perfmeasure } from 'zss/perf/ui'

export function handletick(vm: DEVICE, _message: MESSAGE): void {
  void _message
  if (memoryreadfreeze()) {
    return
  }

  memoryscanplayers(tracking)

  perfmeasure('vm:memorytickloaders', () => {
    const player = memoryreadoperator()
    const timestamp = memorytickloaders()
    boardrunnertick(vm, player, timestamp)
  })

  perfmeasure('vm:memorysyncpushdirty', () => {
    memorysyncpushdirty()
  })

  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const { runnerchoices, playeridsbyboard } = memoryreadboardrunnerchoices(
    mainbook,
    tracking,
    failedboardrunners,
    ackboardrunners,
  )

  const ownershipdirty = new Set<string>()

  evictstaleboardrunnersfromacktick(playeridsbyboard, ownershipdirty)
  syncboardrunnerstoacks(playeridsbyboard, ownershipdirty)
  applyrunnerchoices(vm, runnerchoices, playeridsbyboard, ownershipdirty)
  droprunnerswithnoplayers(playeridsbyboard, ownershipdirty)

  ownershipdirty.forEach((player) => {
    boardrunnerowned(vm, player, playerboardrunnerowntarget(player))
  })
}

function evictstaleboardrunnersfromacktick(
  playeridsbyboard: Record<string, string[]>,
  ownershipdirty: Set<string>,
): void {
  const now = Date.now()
  const boards = Object.keys(boardrunners)
  for (let i = 0; i < boards.length; ++i) {
    const boardid = boards[i]
    const elected = boardrunners[boardid]
    const acked = ackboardrunners[boardid]
    if (
      !isstring(elected) ||
      !elected.length ||
      acked !== elected ||
      !boardrunnerackeligible(
        boardid,
        elected,
        playeridsbyboard,
        failedboardrunners,
      )
    ) {
      continue
    }
    const last = boardrunnerlastacktickat[boardid]
    if (last === undefined) {
      boardrunnerlastacktickat[boardid] = now
      continue
    }
    if (now - last <= BOARDRUNNER_ACKTICK_STALE_MS) {
      continue
    }
    const prevack = ackboardrunners[boardid]
    if (typeof prevack === 'string' && prevack.length > 0) {
      memorysyncrevokeboardrunner(prevack, boardid)
      ownershipdirty.add(prevack)
    }
    delete boardrunners[boardid]
    delete ackboardrunners[boardid]
    clearboardrunnerlastacktick(boardid)
    delete failedboardrunners[boardid]
    ownershipdirty.add(elected)
  }
}

function syncboardrunnerstoacks(
  playeridsbyboard: Record<string, string[]>,
  ownershipdirty: Set<string>,
): void {
  const ackboards = Object.keys(ackboardrunners)
  for (let ai = 0; ai < ackboards.length; ++ai) {
    const boardid = ackboards[ai]
    const ack = ackboardrunners[boardid]
    if (
      !boardrunnerackeligible(
        boardid,
        ack,
        playeridsbyboard,
        failedboardrunners,
      )
    ) {
      continue
    }
    const prev = boardrunners[boardid]
    if (prev === ack) {
      if (failedboardrunners[boardid]?.[ack] !== undefined) {
        delete failedboardrunners[boardid][ack]
        if (Object.keys(failedboardrunners[boardid]).length === 0) {
          delete failedboardrunners[boardid]
        }
      }
      continue
    }
    if (ispresent(prev) && isstring(prev) && prev.length > 0) {
      ownershipdirty.add(prev)
      if (failedboardrunners[boardid]?.[prev] !== undefined) {
        delete failedboardrunners[boardid][prev]
        if (Object.keys(failedboardrunners[boardid]).length === 0) {
          delete failedboardrunners[boardid]
        }
      }
    }
    boardrunners[boardid] = ack
    ownershipdirty.add(ack)
    if (failedboardrunners[boardid]?.[ack] !== undefined) {
      delete failedboardrunners[boardid][ack]
      if (Object.keys(failedboardrunners[boardid]).length === 0) {
        delete failedboardrunners[boardid]
      }
    }
  }
}

function applyrunnerchoices(
  vm: DEVICE,
  runnerchoices: Record<string, string>,
  playeridsbyboard: Record<string, string[]>,
  ownershipdirty: Set<string>,
): void {
  const choiceboards = Object.keys(runnerchoices)
  for (let i = 0; i < choiceboards.length; ++i) {
    const boardid = choiceboards[i]
    const maybeplayer = boardrunners[boardid]
    const playerids = playeridsbyboard[boardid] ?? []
    if (ispresent(maybeplayer)) {
      if (playerids.includes(maybeplayer)) {
        // keep it
      } else {
        const prevack = ackboardrunners[boardid]
        if (typeof prevack === 'string' && prevack.length > 0) {
          memorysyncrevokeboardrunner(prevack, boardid)
          ownershipdirty.add(prevack)
        }
        delete boardrunners[boardid]
        delete ackboardrunners[boardid]
        clearboardrunnerlastacktick(boardid)
        delete failedboardrunners[boardid]
      }
    }
    if (!ispresent(boardrunners[boardid])) {
      const elected = runnerchoices[boardid]
      boardrunners[boardid] = elected
      const prevack = ackboardrunners[boardid]
      if (
        typeof prevack === 'string' &&
        prevack.length > 0 &&
        prevack !== elected
      ) {
        memorysyncrevokeboardrunner(prevack, boardid)
        ownershipdirty.add(prevack)
      }
      delete ackboardrunners[boardid]
      clearboardrunnerlastacktick(boardid)
      failedboardrunners[boardid] ??= {}
      failedboardrunners[boardid][elected] = 0
      ownershipdirty.add(elected)
      registerboardrunnerask(vm, elected, boardid)
    }
  }
}

function droprunnerswithnoplayers(
  playeridsbyboard: Record<string, string[]>,
  ownershipdirty: Set<string>,
): void {
  const activeboards = Object.keys(boardrunners)
  for (let i = 0; i < activeboards.length; ++i) {
    const boardid = activeboards[i]
    const playerids = playeridsbyboard[boardid] ?? []
    if (playerids.length === 0) {
      const prevack = ackboardrunners[boardid]
      if (typeof prevack === 'string' && prevack.length > 0) {
        memorysyncrevokeboardrunner(prevack, boardid)
        ownershipdirty.add(prevack)
      }
      delete boardrunners[boardid]
      delete ackboardrunners[boardid]
      clearboardrunnerlastacktick(boardid)
      delete failedboardrunners[boardid]
    }
  }
}
