import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  apilog,
  boardrunnerowned,
  registerinspector,
  registerloginready,
  vmclearscroll,
} from 'zss/device/api'
import {
  memorysyncdropplayerfromall,
  memorysyncrevokeboardrunner,
} from 'zss/device/vm/memorysync'
import {
  INITIAL_TRACKING,
  ackboardrunners,
  boardrunners,
  failedboardrunners,
  lastinputtime,
  tracking,
} from 'zss/device/vm/state'
import { isstring } from 'zss/mapping/types'
import {
  memoryistokenbanned,
  memorysetcommandpermissions,
  memorysetplayertotoken,
} from 'zss/memory/permissions'
import {
  memoryloginplayer,
  memorylogoutplayer,
  memoryreadplayeractive,
} from 'zss/memory/playermanagement'
import {
  memoryisoperator,
  memoryreadoperator,
  memorywritehalt,
} from 'zss/memory/session'
import type { BOOK_FLAGS } from 'zss/memory/types'
import { memoryreadconfig, memorysetconfig } from 'zss/memory/utilities'

export function handlesearch(vm: DEVICE, message: MESSAGE): void {
  if (!memoryreadplayeractive(message.player)) {
    registerloginready(vm, message.player)
  }
}

export function handlelogout(vm: DEVICE, message: MESSAGE): void {
  vmclearscroll(vm, message.player)
  // Before the player's flags are cleared, revoke their admissions to any
  // board streams they owned as an elected runner, drop any runner slots
  // that still reference them, and tell their worker ownership is empty.
  // Without this the departing player's worker would keep its jsonsync
  // admissions (getting pokes / writes through) and keep emitting paints
  // from a stale baseline after they log back in.
  const ownedboards = Object.keys(boardrunners)
  for (let i = 0; i < ownedboards.length; ++i) {
    const boardid = ownedboards[i]
    if (boardrunners[boardid] === message.player) {
      memorysyncrevokeboardrunner(message.player, boardid)
      delete boardrunners[boardid]
      delete ackboardrunners[boardid]
      delete failedboardrunners[boardid]
    } else if (ackboardrunners[boardid] === message.player) {
      memorysyncrevokeboardrunner(message.player, boardid)
      delete ackboardrunners[boardid]
    }
  }
  boardrunnerowned(vm, message.player, [])
  memorylogoutplayer(message.player, !!message.data)
  memorysyncdropplayerfromall(message.player)
  delete tracking[message.player]
  delete lastinputtime[message.player]
  apilog(vm, memoryreadoperator(), `player ${message.player} logout`)
  registerloginready(vm, message.player)
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
  console.info('VM => storage', flags)

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

  if (isstring(token)) {
    memorysetplayertotoken(message.player, token)
  }

  if (isstring(token) && memoryistokenbanned(token)) {
    vm.replynext(message, 'acklogin', false)
    return
  }

  if (memoryloginplayer(message.player, flags as BOOK_FLAGS)) {
    tracking[message.player] = INITIAL_TRACKING
    lastinputtime[message.player] = Date.now()
    apilog(vm, memoryreadoperator(), `login from ${message.player}`)
    vm.replynext(message, 'acklogin', true)
  } else {
    vm.replynext(message, 'acklogin', false)
  }
}

export function handleplayertoken(_vm: DEVICE, message: MESSAGE): void {
  if (isstring(message.data)) {
    memorysetplayertotoken(message.player, message.data)
  }
}

export function handlelocal(vm: DEVICE, message: MESSAGE): void {
  if (memoryloginplayer(message.player, {})) {
    tracking[message.player] = INITIAL_TRACKING
    lastinputtime[message.player] = Date.now()
    apilog(vm, memoryreadoperator(), `login from ${message.player}`)
    vm.replynext(message, 'acklogin', true)
  } else {
    vm.replynext(message, 'acklogin', false)
  }
}
