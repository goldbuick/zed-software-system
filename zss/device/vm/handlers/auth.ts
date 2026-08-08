import type { DEVICE } from 'zss/device'
import {
  apilog,
  gadgetclientgotofade,
  registerinspector,
  registerloginready,
} from 'zss/device/api'
import type { MESSAGE } from 'zss/device/types'
import { handlegadgetdesync } from 'zss/device/vm/gadgetsynctick'
import {
  emitchatconnectplayer,
  emitchatdisconnectplayer,
  maybeemitplayerchatroster,
} from 'zss/device/vm/playerchatroster'
import { lastinputtime, tracking } from 'zss/device/vm/state'
import { sanitizeloginflags } from 'zss/feature/loginflags'
import { isstring } from 'zss/mapping/types'
import {
  memoryistokenbanned,
  memorysetcommandpermissions,
  memorysetplayertotoken,
} from 'zss/memory/permissions'
import {
  memoryloginplayer,
  memorylogoutplayer,
} from 'zss/memory/playermanagement'
import {
  memoryisoperator,
  memoryreadoperator,
  memorywritehalt,
} from 'zss/memory/session'
import { BOOK_FLAGS } from 'zss/memory/types'
import { memoryreadconfig, memorysetconfig } from 'zss/memory/utilities'

export function handlesearch(vm: DEVICE, message: MESSAGE): void {
  registerloginready(vm, message.player)
}

export function handlelogout(vm: DEVICE, message: MESSAGE): void {
  const player = message.player

  gadgetclientgotofade(vm, player, true)

  function clearlogouttracking() {
    delete tracking[player]
    delete lastinputtime[player]
    maybeemitplayerchatroster(vm, player, true)
  }

  emitchatdisconnectplayer(vm, player)
  memorylogoutplayer(player)
  registerloginready(vm, player)
  clearlogouttracking()
}

function configlog(
  vm: DEVICE,
  player: string,
  config: string,
  enabled: boolean,
) {
  apilog(vm, player, `${config} ${enabled ? '$greenon' : '$redoff'}`)
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

      const shouldcrt = memoryreadconfig('crt') === 'on'
      configlog(vm, message.player, 'crt', shouldcrt)

      const shouldscanlines = memoryreadconfig('scanlines') === 'on'
      configlog(vm, message.player, 'scanlines', shouldscanlines)

      const shouldvoice2text = memoryreadconfig('voice2text') === 'on'
      configlog(vm, message.player, 'voice2text', shouldvoice2text)

      const shouldloaderlogging = memoryreadconfig('loaderlogging') === 'on'
      configlog(vm, message.player, 'loaderlogging', shouldloaderlogging)

      const shouldmemoryfslogging = memoryreadconfig('memoryfslogging') === 'on'
      configlog(vm, message.player, 'memoryfslogging', shouldmemoryfslogging)

      const shouldhalt = memoryreadconfig('dev') === 'on'
      configlog(vm, message.player, 'dev', shouldhalt)
      memorywritehalt(shouldhalt)

      const shouldgadget = memoryreadconfig('gadget') === 'on'
      registerinspector(vm, message.player, shouldgadget)

      apilog(
        vm,
        message.player,
        `use $YELLOW#$GREENadmin $WHITEto change config`,
      )
    }
  }

  if (isstring(token)) {
    if (memoryistokenbanned(token)) {
      vm.replynext(message, 'acklogin', false)
      return
    }
    memorysetplayertotoken(message.player, token)
  }

  if (
    memoryloginplayer(message.player, sanitizeloginflags(flags) as BOOK_FLAGS)
  ) {
    tracking[message.player] = 0
    lastinputtime[message.player] = Date.now()

    apilog(vm, memoryreadoperator(), `login from ${message.player}`)
    vm.replynext(message, 'acklogin', true)

    emitchatconnectplayer(vm, message.player)

    handlegadgetdesync(vm, message)
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
    emitchatconnectplayer(vm, message.player)
  } else {
    vm.replynext(message, 'acklogin', false)
  }
}
