import type { DEVICE } from 'zss/device'
import {
  apilog,
  boardrunnerlinkdead,
  registerinspector,
  registerloginready,
} from 'zss/device/api'
import type { MESSAGE } from 'zss/device/types'
import {
  boardrunnerassignmentvalid,
  boardrunnerelect,
} from 'zss/device/vm/boardrunnermanagement'
import { boardrunnerpushupdates } from 'zss/device/vm/boardrunnerpushupdates'
import { handlegadgetdesync } from 'zss/device/vm/gadgetsynctick'
import {
  boardrunnerblocked,
  boardrunners,
  lastinputtime,
  tracking,
} from 'zss/device/vm/state'
import { debugingest } from 'zss/debugingest'
import { sanitizeloginflags } from 'zss/feature/loginflags'
import { ispresent, isstring } from 'zss/mapping/types'
import {
  memoryistokenbanned,
  memorysetcommandpermissions,
  memorysetplayertotoken,
} from 'zss/memory/permissions'
import {
  memoryloginplayer,
  memorylogoutplayer,
  memoryreadplayerboard,
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
  const currentboard = memoryreadplayerboard(player)

  function clearlogouttracking() {
    delete tracking[player]
    delete lastinputtime[player]
    boardrunnerblocked[player] = true
  }

  // No flags.board: still tear down tracking and purge any board copies.
  // Skipping this left tracking hot and handlesecond retried vmlogout forever.
  if (!ispresent(currentboard)) {
    debugingest(
      'auth.ts:handlelogout',
      'logout no board host cleanup',
      { player, hasrunner: false },
      'H3',
    )
    memorylogoutplayer(player)
    clearlogouttracking()
    boardrunnerpushupdates(vm)
    return
  }

  const priorelectionrunner = boardrunners[currentboard.id]
  const hasrunner = isstring(priorelectionrunner) && !!priorelectionrunner

  debugingest(
    'auth.ts:handlelogout',
    'logout linkdead dispatch',
    {
      player,
      boardid: currentboard.id,
      hasrunner,
      runner: hasrunner ? priorelectionrunner : '',
    },
    'H3',
  )

  if (hasrunner) {
    boardrunnerlinkdead(vm, priorelectionrunner, player)
  } else {
    // No elected runner to run linkdead -- host deletes and syncs.
    memorylogoutplayer(player)
    boardrunnerpushupdates(vm)
  }

  clearlogouttracking()

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

  // const reattach = memoryreadplayeractive(message.player)

  // attempt to login player
  if (
    memoryloginplayer(message.player, sanitizeloginflags(flags) as BOOK_FLAGS)
  ) {
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

    // always desync the gadget
    handlegadgetdesync(vm, message)
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
