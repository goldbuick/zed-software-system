/* eslint-disable react-refresh/only-export-components */
// @ts-expect-error yes
import { GamepadListener } from 'gamepad.js'
import isHotKey from 'is-hotkey'
import mitt from 'mitt'
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'
import { objectKeys } from 'ts-extras'
import { createdevice } from 'zss/device'
import { api_log, vm_cli, vm_doot, vm_input, vm_local } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import {
  INPUT,
  INPUT_ALT,
  INPUT_CTRL,
  INPUT_SHIFT,
} from 'zss/gadget/data/types'
import { isnumber, ispresent } from 'zss/mapping/types'
import { dirfromdelta } from 'zss/words/dir'
import { ismac } from 'zss/words/system'
import { DIR, NAME } from 'zss/words/types'

// user input

type INPUT_STATE = Record<INPUT, boolean>

export type UserInputMods = {
  alt: boolean
  ctrl: boolean
  shift: boolean
}

const inputstates: Record<number, INPUT_STATE> = {}
function playerlocal(index: number) {
  return `${registerreadplayer()}local${index}`
}

// handle input repeat
const acc: Record<number, number> = {}
let localtick = 0
let previous = performance.now()
export const INPUT_RATE = 100

const INPUT_OPS = [
  INPUT.MOVE_UP,
  INPUT.MOVE_DOWN,
  INPUT.MOVE_LEFT,
  INPUT.MOVE_RIGHT,
  INPUT.OK_BUTTON,
  INPUT.CANCEL_BUTTON,
  INPUT.MENU_BUTTON,
]

function pollinput() {
  const now = performance.now()
  const delta = now - previous

  const idx = objectKeys(inputstates)
  for (let i = 0; i < idx.length; ++i) {
    const index = parseFloat(idx[i])
    acc[index] = acc[index] ?? 0
    acc[index] += delta
    if (acc[index] >= INPUT_RATE) {
      acc[index] -= INPUT_RATE
      const inputstate = inputstates[index]
      // signal input state
      const mods: UserInputMods = {
        alt: !!inputstate[INPUT.ALT],
        ctrl: !!inputstate[INPUT.CTRL],
        shift: !!inputstate[INPUT.SHIFT],
      }
      for (let ii = 0; ii < INPUT_OPS.length; ++ii) {
        const input = INPUT_OPS[ii]
        if (inputstate[input]) {
          userinputinvoke(index, input, mods)
        }
      }
    }
  }

  ++localtick
  previous = now
  setTimeout(pollinput, 10)

  if (localtick > 32) {
    localtick = 0
    const idx = objectKeys(inputstates)
    for (let i = 0; i < idx.length; ++i) {
      const index = parseFloat(idx[i])
      vm_doot(SOFTWARE, playerlocal(index))
    }
  }
}
pollinput()

function readinput(index: number): INPUT_STATE {
  inputstates[index] = inputstates[index] ?? {
    [INPUT.NONE]: false,
    [INPUT.ALT]: false,
    [INPUT.CTRL]: false,
    [INPUT.SHIFT]: false,
    [INPUT.MOVE_UP]: false,
    [INPUT.MOVE_DOWN]: false,
    [INPUT.MOVE_LEFT]: false,
    [INPUT.MOVE_RIGHT]: false,
    [INPUT.OK_BUTTON]: false,
    [INPUT.CANCEL_BUTTON]: false,
    [INPUT.MENU_BUTTON]: false,
  }
  return inputstates[index]
}

function inputdown(index: number, input: INPUT) {
  const inputstate = readinput(index)
  // make sure to trigger input event
  // when we change from false to true state
  if (!inputstate[input]) {
    // reset input repeat
    acc[index] = INPUT_RATE * -2
    // emit input event
    userinputinvoke(index, input, {
      alt: inputstate[INPUT.ALT],
      ctrl: inputstate[INPUT.CTRL],
      shift: inputstate[INPUT.SHIFT],
    })
  }
  // track state change
  inputstate[input] = true
}

function inputup(index: number, input: INPUT) {
  const inputstate = readinput(index)
  inputstate[input] = false
}

// focus

const user = {
  root: mitt(),
  ignorehotkeys: false,
}
export const UserInputContext = createContext(user.root)

// keyboard input
export type KeyboardInputHandler = (event: KeyboardEvent) => void

export function modsfromevent(event: KeyboardEvent): UserInputMods {
  return {
    alt: event.altKey,
    ctrl: ismac ? event.metaKey : event.ctrlKey,
    shift: event.shiftKey,
  }
}

function userinputinvoke(index: number, input: INPUT, mods: UserInputMods) {
  if (index === 0) {
    // primary input
    user.root.emit(INPUT[input], mods)
  } else {
    // local multiplayer input
    let bits = 0
    const player = playerlocal(index)
    if (mods.alt) {
      bits |= INPUT_ALT
    }
    if (mods.ctrl) {
      bits |= INPUT_CTRL
    }
    if (mods.shift) {
      bits |= INPUT_SHIFT
    }
    vm_input(SOFTWARE, player, input, bits)
  }
}

document.addEventListener(
  'keydown',
  (event) => {
    const key = NAME(event.key)
    const mods = modsfromevent(event)
    const player = registerreadplayer()

    // block default browser behavior that messes with things
    switch (key) {
      case 's': // override default behavior
      case 'j':
      case 'o':
      case 'f':
      case 'z':
      case 'y':
      case 'e':
      case 'k':
      case 'p': // prevent default behavior
      case 'arrowleft':
      case 'arrowright':
      case 'arrowup':
      case 'arrowdown':
        if (mods.alt || mods.ctrl || mods.shift) {
          event.preventDefault()
        }
        break
      case 'tab':
        event.preventDefault()
        break
    }

    if (mods.alt) {
      inputdown(0, INPUT.ALT)
    } else {
      inputup(0, INPUT.ALT)
    }
    if (mods.ctrl) {
      inputdown(0, INPUT.CTRL)
    } else {
      inputup(0, INPUT.CTRL)
    }
    if (mods.shift) {
      inputdown(0, INPUT.SHIFT)
    } else {
      inputup(0, INPUT.SHIFT)
    }

    // keyboard built-in player inputs
    switch (key) {
      case 'arrowleft':
        inputdown(0, INPUT.MOVE_LEFT)
        break
      case 'arrowright':
        inputdown(0, INPUT.MOVE_RIGHT)
        break
      case 'arrowup':
        inputdown(0, INPUT.MOVE_UP)
        break
      case 'arrowdown':
        inputdown(0, INPUT.MOVE_DOWN)
        break
      case 'enter':
        inputdown(0, INPUT.OK_BUTTON)
        break
      case 'esc':
      case 'escape':
        inputdown(0, INPUT.CANCEL_BUTTON)
        break
      case 'tab':
        inputdown(0, INPUT.MENU_BUTTON)
        break
      case 's':
        if (mods.ctrl) {
          vm_cli(SOFTWARE, player, '#save')
        }
        break
      case 'j':
        if (mods.ctrl) {
          vm_cli(SOFTWARE, player, mods.shift ? '#jointab hush' : '#jointab')
        }
        break
      case 'o':
        if (mods.ctrl) {
          vm_cli(SOFTWARE, player, mods.shift ? '#joincode hush' : '#joincode')
        }
        break
      case 'l':
        if (mods.ctrl) {
          // open merge login request
        }
        break
      case 'f':
        if (mods.ctrl) {
          vm_cli(SOFTWARE, player, '#fork')
        }
        break
    }
    user.root.emit('keydown', event)
  },
  { capture: true },
)

document.addEventListener(
  'keyup',
  (event) => {
    const key = NAME(event.key)
    const mods = modsfromevent(event)

    if (mods.alt) {
      inputdown(0, INPUT.ALT)
    } else {
      inputup(0, INPUT.ALT)
    }
    if (mods.ctrl) {
      inputdown(0, INPUT.CTRL)
    } else {
      inputup(0, INPUT.CTRL)
    }
    if (mods.shift) {
      inputdown(0, INPUT.SHIFT)
    } else {
      inputup(0, INPUT.SHIFT)
    }

    // keyboard built-in player inputs
    switch (key) {
      case 'meta':
        // special case for macos cmd + arrow keys
        inputup(0, INPUT.MOVE_LEFT)
        inputup(0, INPUT.MOVE_RIGHT)
        inputup(0, INPUT.MOVE_UP)
        inputup(0, INPUT.MOVE_DOWN)
        break
      case 'arrowleft':
        inputup(0, INPUT.MOVE_LEFT)
        break
      case 'arrowright':
        inputup(0, INPUT.MOVE_RIGHT)
        break
      case 'arrowup':
        inputup(0, INPUT.MOVE_UP)
        break
      case 'arrowdown':
        inputup(0, INPUT.MOVE_DOWN)
        break
      case 'enter':
        inputup(0, INPUT.OK_BUTTON)
        break
      case 'esc':
      case 'escape':
        inputup(0, INPUT.CANCEL_BUTTON)
        break
      case 'tab':
        inputup(0, INPUT.MENU_BUTTON)
        break
    }
  },
  { capture: true },
)

createdevice('userinput', ['tock'], (message) => {
  switch (message.target) {
    case 'up':
      if (isnumber(message.data)) {
        inputup(0, message.data)
      }
      break
    case 'down':
      if (isnumber(message.data)) {
        inputdown(0, message.data)
      }
      break
  }
})

// gamepad input

const BUTTON_A = 0
const BUTTON_B = 1

const BUTTON_X = 2
const BUTTON_Y = 3

const BUTTON_LEFT_SHOULDER = 4
const BUTTON_RIGHT_SHOULDER = 5
const BUTTON_LEFT_TRIGGER = 6
const BUTTON_RIGHT_TRIGGER = 7

const BUTTON_MENU = 9

const BUTTON_UP = 12
const BUTTON_DOWN = 13
const BUTTON_LEFT = 14
const BUTTON_RIGHT = 15

const buttonlookup: Record<number, INPUT> = {
  [BUTTON_Y]: INPUT.MOVE_UP,
  [BUTTON_A]: INPUT.MOVE_DOWN,
  [BUTTON_X]: INPUT.MOVE_LEFT,
  [BUTTON_B]: INPUT.MOVE_RIGHT,
  [BUTTON_LEFT_SHOULDER]: INPUT.OK_BUTTON,
  [BUTTON_RIGHT_SHOULDER]: INPUT.CANCEL_BUTTON,
  [BUTTON_LEFT_TRIGGER]: INPUT.SHIFT,
  [BUTTON_RIGHT_TRIGGER]: INPUT.SHIFT,
  [BUTTON_MENU]: INPUT.MENU_BUTTON,
  [BUTTON_UP]: INPUT.MOVE_UP,
  [BUTTON_DOWN]: INPUT.MOVE_DOWN,
  [BUTTON_LEFT]: INPUT.MOVE_LEFT,
  [BUTTON_RIGHT]: INPUT.MOVE_RIGHT,
}

const axisstate: Record<number, Record<number, number>> = {}
function readaxis(index: number) {
  axisstate[index] = axisstate[index] ?? {}
  return axisstate[index]
}
function writeaxis(index: number, axis: number, value: number) {
  const axisstate = readaxis(index)
  const prevleft = dirfromdelta(axisstate[0] ?? 0, axisstate[1] ?? 0)
  const prevright = dirfromdelta(axisstate[2] ?? 0, axisstate[3] ?? 0)
  axisstate[axis] = value
  const nextleft = dirfromdelta(axisstate[0] ?? 0, axisstate[1] ?? 0)
  const nextright = dirfromdelta(axisstate[2] ?? 0, axisstate[3] ?? 0)
  if (prevleft !== nextleft) {
    inputup(index, INPUT.MOVE_LEFT)
    inputup(index, INPUT.MOVE_RIGHT)
    inputup(index, INPUT.MOVE_UP)
    inputup(index, INPUT.MOVE_DOWN)
    switch (nextleft) {
      case DIR.NORTH:
        inputdown(index, INPUT.MOVE_UP)
        break
      case DIR.SOUTH:
        inputdown(index, INPUT.MOVE_DOWN)
        break
      case DIR.WEST:
        inputdown(index, INPUT.MOVE_LEFT)
        break
      case DIR.EAST:
        inputdown(index, INPUT.MOVE_RIGHT)
        break
    }
  }
  if (prevright !== nextright) {
    if (nextright === DIR.IDLE) {
      inputup(index, INPUT.SHIFT)
    } else {
      inputdown(index, INPUT.SHIFT)
    }
    inputup(index, INPUT.MOVE_LEFT)
    inputup(index, INPUT.MOVE_RIGHT)
    inputup(index, INPUT.MOVE_UP)
    inputup(index, INPUT.MOVE_DOWN)
    switch (nextright) {
      case DIR.NORTH:
        inputdown(index, INPUT.MOVE_UP)
        break
      case DIR.SOUTH:
        inputdown(index, INPUT.MOVE_DOWN)
        break
      case DIR.WEST:
        inputdown(index, INPUT.MOVE_LEFT)
        break
      case DIR.EAST:
        inputdown(index, INPUT.MOVE_RIGHT)
        break
    }
  }
}

const gamepads = new GamepadListener({
  analog: false,
  deadZone: 0.3,
})
gamepads.on('gamepad:connected', (event: any) => {
  const player = registerreadplayer()
  api_log(SOFTWARE, player, `connected ${event.detail.gamepad.id}`)
  readinput(event.detail.index)
  if (event.detail.index > 0) {
    vm_local(SOFTWARE, playerlocal(event.detail.index))
  }
})
gamepads.on('gamepad:disconnected', (event: any) => {
  const player = registerreadplayer()
  api_log(SOFTWARE, player, `disconnected gamepad ${event.detail.index}`)
  delete inputstates[event.detail.index]
})
gamepads.on('gamepad:axis', (event: any) => {
  writeaxis(event.detail.index, event.detail.axis, event.detail.value)
})
gamepads.on('gamepad:button', (event: any) => {
  const index = event.detail.index
  switch (event.detail.button) {
    case BUTTON_X:
    case BUTTON_B:
    case BUTTON_Y:
    case BUTTON_A:
      inputup(index, INPUT.MOVE_UP)
      inputup(index, INPUT.MOVE_DOWN)
      inputup(index, INPUT.MOVE_LEFT)
      inputup(index, INPUT.MOVE_RIGHT)
      if (event.detail.value) {
        inputdown(event.detail.index, INPUT.SHIFT)
        inputdown(event.detail.index, buttonlookup[event.detail.button])
      } else {
        inputup(event.detail.index, INPUT.SHIFT)
      }
      break
    default:
      if (event.detail.value) {
        inputdown(event.detail.index, buttonlookup[event.detail.button])
      } else {
        inputup(event.detail.index, buttonlookup[event.detail.button])
      }
      break
  }
})
gamepads.start()

// mouse && touch input - used to activate :tap labels

// components

const HOTKEY_EVENT = 'keyup'

type UserHotkeyProps = {
  hotkey: string
  althotkey?: string
  children: () => void
}

export function UserHotkey({ hotkey, althotkey, children }: UserHotkeyProps) {
  useEffect(() => {
    const invokecheck = isHotKey(hotkey, { byKey: true })
    const altinvokecheck = ispresent(althotkey)
      ? isHotKey(althotkey, { byKey: true })
      : undefined
    function hotkeycheck(event: KeyboardEvent) {
      if (
        user.ignorehotkeys === false &&
        (invokecheck(event) || altinvokecheck?.(event))
      ) {
        children()
      }
    }
    document.addEventListener(HOTKEY_EVENT, hotkeycheck, false)
    return () => document.removeEventListener(HOTKEY_EVENT, hotkeycheck, false)
  }, [hotkey, althotkey, children])

  return null
}

export type UserInputHandler = (mods: UserInputMods) => void

type UserInputProps = {
  MOVE_LEFT?: UserInputHandler
  MOVE_RIGHT?: UserInputHandler
  MOVE_UP?: UserInputHandler
  MOVE_DOWN?: UserInputHandler
  OK_BUTTON?: UserInputHandler
  CANCEL_BUTTON?: UserInputHandler
  MENU_BUTTON?: UserInputHandler
  keydown?: KeyboardInputHandler
}

export function UserInput(events: UserInputProps) {
  const context = useContext(UserInputContext)

  useEffect(() => {
    const list = Object.entries(events)

    // @ts-expect-error ugh
    list.forEach(([key, value]) => context.on(key, value))
    return () => {
      // @ts-expect-error ugh
      list.forEach(([key, value]) => context.off(key, value))
    }
  }, [context, events])

  return null
}

type UserFocusProps = {
  blockhotkeys?: boolean
  children?: ReactNode
}

export function UserFocus({ blockhotkeys, children }: UserFocusProps) {
  // event entry point
  const [current] = useState(() => mitt())

  // re-write entry point
  useEffect(() => {
    const old = user.root
    const oldconfig = user.ignorehotkeys
    user.root = current
    user.ignorehotkeys = !!blockhotkeys

    return () => {
      user.root = old
      user.ignorehotkeys = oldconfig
    }
  }, [current, blockhotkeys])

  return (
    <UserInputContext.Provider value={current}>
      {children}
    </UserInputContext.Provider>
  )
}
