import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  apilog,
  registerinspector,
  registerloginready,
  vmclearscroll,
} from 'zss/device/api'
import { boardrunnerpushupdates } from 'zss/device/vm/boardrunnerpushupdates'
import { lastinputtime, tracking } from 'zss/device/vm/state'
import { deepcopy, isstring } from 'zss/mapping/types'
import { memoryexportbookasjson } from 'zss/memory/bookoperations'
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
  memoryreadbookbysoftware,
  memoryreadoperator,
  memorywritehalt,
} from 'zss/memory/session'
import { BOOK_FLAGS, MEMORY_LABEL } from 'zss/memory/types'
import { memoryreadconfig, memorysetconfig } from 'zss/memory/utilities'

export function handlesearch(vm: DEVICE, message: MESSAGE): void {
  if (!memoryreadplayeractive(message.player)) {
    registerloginready(vm, message.player)
  }
}

export function handlelogout(vm: DEVICE, message: MESSAGE): void {
  // clear player state
  vmclearscroll(vm, message.player)
  memorylogoutplayer(message.player, !!message.data)

  console.info(
    'MEMORY STATE on logout',
    deepcopy(
      memoryexportbookasjson(memoryreadbookbysoftware(MEMORY_LABEL.MAIN)),
    ),
  )

  // clear tracking state
  delete tracking[message.player]
  delete lastinputtime[message.player]

  // signal logout
  apilog(vm, memoryreadoperator(), `player ${message.player} logout`)
  registerloginready(vm, message.player)

  // push jsonpipe changes
  boardrunnerpushupdates(vm)
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
    console.info('VM => storage', flags)
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
