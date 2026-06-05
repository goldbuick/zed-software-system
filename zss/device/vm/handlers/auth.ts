import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  apilog,
  boardrunnerlinkdead,
  registerinspector,
  registerloginready,
} from 'zss/device/api'
import { boardrunnerpushupdates } from 'zss/device/vm/boardrunnerpushupdates'
import {
  boardrunnerblocked,
  boardrunners,
  lastinputtime,
  tracking,
} from 'zss/device/vm/state'
import { ispresent, isstring } from 'zss/mapping/types'
import {
  memoryistokenbanned,
  memorysetcommandpermissions,
  memorysetplayertotoken,
} from 'zss/memory/permissions'
import {
  memoryloginplayer,
  memoryreadplayeractive,
  memoryreadplayerboard,
} from 'zss/memory/playermanagement'
import {
  memoryisoperator,
  memoryreadoperator,
  memorywritehalt,
} from 'zss/memory/session'
import { BOOK_FLAGS } from 'zss/memory/types'
import { memoryreadconfig, memorysetconfig } from 'zss/memory/utilities'

import {
  boardrunnerassignmentvalid,
  boardrunnerelect,
} from '../boardrunnermanagement'

export function handlesearch(vm: DEVICE, message: MESSAGE): void {
  if (!memoryreadplayeractive(message.player)) {
    registerloginready(vm, message.player)
  }
}

export function handlelogout(vm: DEVICE, message: MESSAGE): void {

  // grab the current board the player is on
  const currentboard = memoryreadplayerboard(message.player)
  if (!ispresent(currentboard)) {
    return
  }

  // grab the current boardrunner the player is on
  const priorelectionrunner = boardrunners[currentboard.id]

  // notify the boardrunner worker that this is linkdead
  boardrunnerlinkdead(vm, priorelectionrunner, message.player)

  // clear tracking state
  delete tracking[message.player]
  delete lastinputtime[message.player]

  // prevent logout player from being elected as a runner
  boardrunnerblocked[message.player] = true

  // grab the current board to validate runner assignment
  if (boardrunnerassignmentvalid(currentboard.id)) {
    boardrunnerelect(currentboard.id)
  }
}

export function handlelogin(vm: DEVICE, message: MESSAGE): void {
  const {
    bannedtokens,
    rolebytoken,
    permissionconfig,
    allowlistbyrole,
    allowlistbyrolecustom,
    permissionoverrideaddbyrole,
    permissionoverrideremovebyrole,
    config,
    token,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    zss_bookmarks: _zssbookmarks,
    ...flags
  } = message.data ?? {}

  if (memoryisoperator(message.player)) {
    memorysetcommandpermissions(
      bannedtokens ?? [],
      rolebytoken ?? {},
      permissionconfig ?? 'creative',
      allowlistbyrole ?? {},
      allowlistbyrolecustom ?? {},
      permissionoverrideaddbyrole,
      permissionoverrideremovebyrole,
    )
    if (Array.isArray(config)) {
      memorysetconfig(config)
      memorywritehalt(memoryreadconfig('dev') === 'on')
      registerinspector(vm, message.player, memoryreadconfig('gadget') === 'on')
    }
  }

  // token check
  if (isstring(token)) {
    if (memoryistokenbanned(token)) {
      vm.replynext(message, 'acklogin', false)
      return
    }
    memorysetplayertotoken(message.player, token)
  }

  // attempt to login player
  if (memoryloginplayer(message.player, flags as BOOK_FLAGS)) {
    // start tracking
    tracking[message.player] = 0
    lastinputtime[message.player] = Date.now()

    // unblock the player from being elected as a runner
    delete boardrunnerblocked[message.player]

    // elect a new runner for the login board if necessary
    const currentboard = memoryreadplayerboard(message.player)
    if (
      ispresent(currentboard) &&
      !boardrunnerassignmentvalid(currentboard.id)
    ) {
      boardrunnerelect(currentboard.id)
    }

    // signal success
    apilog(vm, memoryreadoperator(), `login from ${message.player}`)
    vm.replynext(message, 'acklogin', true)
  } else {
    vm.replynext(message, 'acklogin', false)
  }

  // push jsonpipe changes
  boardrunnerpushupdates(vm)
}

export function handleplayertoken(_vm: DEVICE, message: MESSAGE): void {
  if (isstring(message.data)) {
    memorysetplayertotoken(message.player, message.data)
  }
}

export function handlelocal(vm: DEVICE, message: MESSAGE): void {
  if (memoryloginplayer(message.player, {})) {
    tracking[message.player] = 0
    lastinputtime[message.player] = Date.now()
    apilog(vm, memoryreadoperator(), `login from ${message.player}`)
    vm.replynext(message, 'acklogin', true)
  } else {
    vm.replynext(message, 'acklogin', false)
  }
}
