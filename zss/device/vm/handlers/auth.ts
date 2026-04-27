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
  ensureboardrunnerelected,
  revokeboardrunnerassignmentsforplayer,
} from 'zss/device/vm/boardrunnerelection'
import {
  memorypushsimsyncdirty,
  memorysyncdropplayerfromall,
  memorysyncensureloginreplstreams,
} from 'zss/device/vm/memorysimsync'
import {
  INITIAL_TRACKING,
  lastinputtime,
  skipboardrunners,
  tracking,
  trackinglastlog,
} from 'zss/device/vm/state'
import { ispresent, isstring } from 'zss/mapping/types'
import {
  memoryistokenbanned,
  memorysetcommandpermissions,
  memorysetplayertotoken,
} from 'zss/memory/permissions'
import {
  memoryloginplayer,
  memorylogoutplayer,
  memoryreadplayeractive,
  memoryreadplayerboard,
  memoryscanplayers,
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

  // revoke boardrunner assignments
  const affectedboards = revokeboardrunnerassignmentsforplayer(message.player)
  const ts = Date.now()
  for (let i = 0; i < affectedboards.length; ++i) {
    ensureboardrunnerelected(vm, affectedboards[i], ts)
  }
  if (affectedboards.length > 0) {
    memorypushsimsyncdirty()
  }

  // halt the bridge
  bridgehalt(vm, message.player)

  // clear the tracking
  delete tracking[message.player]
  delete trackinglastlog[message.player]

  // show logout message
  apilog(vm, memoryreadoperator(), `player ${message.player} logout`)

  // signal for re-login
  registerloginready(vm, message.player)
}

export function handlelogin(vm: DEVICE, message: MESSAGE): void {
  // scan players to ensure we have the latest tracking
  // instead of running this every tick
  memoryscanplayers(tracking)

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
    const ts = Date.now()
    // ensure the player is getting streams
    memorysyncensureloginreplstreams(message.player)

    // start tracking
    tracking[message.player] = INITIAL_TRACKING
    lastinputtime[message.player] = ts

    // ensure boardrunner is elected
    const board = memoryreadplayerboard(message.player)
    if (ispresent(board)) {
      delete skipboardrunners[message.player]
      ensureboardrunnerelected(vm, board.id, ts)
      memorypushsimsyncdirty()
    }

    // signal success !!!
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

export function handlelocal(_vm: DEVICE, _message: MESSAGE): void {
  // TODO: leave this alone for now
  // if (memoryloginplayer(message.player, {})) {
  //   tracking[message.player] = INITIAL_TRACKING
  //   lastinputtime[message.player] = Date.now()
  //   apilog(vm, memoryreadoperator(), `login from ${message.player}`)
  //   vm.replynext(message, 'acklogin', true)
  // } else {
  //   vm.replynext(message, 'acklogin', false)
  // }
}
