import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  apilog,
  registerloginready,
  vmagentstop,
  vmclearscroll,
} from 'zss/device/api'
import { lastinputtime, tracking } from 'zss/device/vm/state'
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
import { memoryisoperator, memoryreadoperator } from 'zss/memory/session'
import type { BOOK_FLAGS } from 'zss/memory/types'
import { memorysetconfig } from 'zss/memory/utilities'

export function handlesearch(vm: DEVICE, message: MESSAGE): void {
  if (!memoryreadplayeractive(message.player)) {
    registerloginready(vm, message.player)
  }
}

export function handlelogout(vm: DEVICE, message: MESSAGE): void {
  vmclearscroll(vm, message.player)
  memorylogoutplayer(message.player, !!message.data)
  delete tracking[message.player]
  delete lastinputtime[message.player]
  apilog(vm, memoryreadoperator(), `player ${message.player} logout`)
  registerloginready(vm, message.player)
  vmagentstop(vm, message.player, message.player)
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
    tracking[message.player] = 0
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
    tracking[message.player] = 0
    lastinputtime[message.player] = Date.now()
    apilog(vm, memoryreadoperator(), `login from ${message.player}`)
    vm.replynext(message, 'acklogin', true)
  } else {
    vm.replynext(message, 'acklogin', false)
  }
}
