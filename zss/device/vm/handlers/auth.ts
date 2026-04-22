import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  apilog,
  bridgehalt,
  registerinspector,
  registerloginready,
  vmclearscroll,
} from 'zss/device/api'
import {
  memorysyncdropplayerfromall,
  memorysyncensureloginreplstreams,
} from 'zss/device/vm/memorysimsync'
import {
  INITIAL_TRACKING,
  lastinputtime,
  tracking,
  trackinglastlog,
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

  // drop the player from all streams
  memorysyncdropplayerfromall(message.player)

  // logout and halt the bridge
  memorylogoutplayer(message.player, !!message.data)
  bridgehalt(vm, message.player)

  // clear the tracking
  delete tracking[message.player]
  delete trackinglastlog[message.player]

  // show logout message
  apilog(vm, memoryreadoperator(), `player ${message.player} logout`)

  // signal for re-login
  setTimeout(() => {
    registerloginready(vm, message.player)
  }, 1000)
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

  if (isstring(token)) {
    memorysetplayertotoken(message.player, token)
  }

  if (isstring(token) && memoryistokenbanned(token)) {
    vm.replynext(message, 'acklogin', false)
    return
  }

  if (memoryloginplayer(message.player, flags as BOOK_FLAGS)) {
    memorysyncensureloginreplstreams(message.player)
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
    memorysyncensureloginreplstreams(message.player)
    tracking[message.player] = INITIAL_TRACKING
    lastinputtime[message.player] = Date.now()
    apilog(vm, memoryreadoperator(), `login from ${message.player}`)
    vm.replynext(message, 'acklogin', true)
  } else {
    vm.replynext(message, 'acklogin', false)
  }
}
