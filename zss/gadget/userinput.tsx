/* eslint-disable react-refresh/only-export-components */
import { GamepadHelper, IGamepadButtonEventDetail } from 'gamepad-helper'
import isHotKey from 'is-hotkey'
import mitt from 'mitt'
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'
import { createdevice } from 'zss/device'
import { vm_cli } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { INPUT } from 'zss/gadget/data/types'
import { isnumber } from 'zss/mapping/types'
import { ismac } from 'zss/words/system'
import { NAME } from 'zss/words/types'

// user input

export type UserInputMods = {
  alt: boolean
  ctrl: boolean
  shift: boolean
}

const inputstate: Record<INPUT, boolean> = {
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

// handle input repeat
let acc = 0
let previous = performance.now()
export const INPUT_RATE = 200

function pollinput() {
  const now = performance.now()
  const delta = now - previous

  acc += delta
  if (acc >= INPUT_RATE) {
    acc %= INPUT_RATE
    // signal input state
    const mods: UserInputMods = {
      alt: !!inputstate[INPUT.ALT],
      ctrl: !!inputstate[INPUT.CTRL],
      shift: !!inputstate[INPUT.SHIFT],
    }
    const inputs = [
      INPUT.MOVE_UP,
      INPUT.MOVE_DOWN,
      INPUT.MOVE_LEFT,
      INPUT.MOVE_RIGHT,
      INPUT.OK_BUTTON,
      INPUT.CANCEL_BUTTON,
      INPUT.MENU_BUTTON,
    ]
    inputs.forEach((input) => {
      if (inputstate[input]) {
        userinputinvoke(input, mods)
      }
    })
  }

  previous = now
  GamepadHelper.update()
  setTimeout(pollinput, 100)
}
pollinput()

function inputdown(input: INPUT) {
  // make sure to trigger input event
  // when we change from false to true state
  if (!inputstate[input]) {
    // reset input repeat
    acc = 0
    // emit input event
    userinputinvoke(input, {
      alt: inputstate[INPUT.ALT],
      ctrl: inputstate[INPUT.CTRL],
      shift: inputstate[INPUT.SHIFT],
    })
  }
  // track state change
  inputstate[input] = true
}

function inputup(input: INPUT) {
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

function userinputinvoke(input: INPUT, mods: UserInputMods) {
  // console.info('userinputinvoke', INPUT[input], mods)
  user.root.emit(INPUT[input], mods)
}

document.addEventListener(
  'keydown',
  (event) => {
    const key = NAME(event.key)
    const mods = modsfromevent(event)

    // block default browser behavior that messes with things
    switch (key) {
      case 's':
      case 't':
      case 'o':
      case 'p':
      case 'f':
      case 't':
      case 'z':
      case 'y':
      case 'arrowleft':
      case 'arrowright':
      case 'arrowup':
      case 'arrowdown':
        if (mods.ctrl) {
          event.preventDefault()
        }
        break
      case 'tab':
        event.preventDefault()
        break
    }

    if (mods.alt) {
      inputdown(INPUT.ALT)
    } else {
      inputup(INPUT.ALT)
    }
    if (mods.ctrl) {
      inputdown(INPUT.CTRL)
    } else {
      inputup(INPUT.CTRL)
    }
    if (mods.shift) {
      inputdown(INPUT.SHIFT)
    } else {
      inputup(INPUT.SHIFT)
    }

    // keyboard built-in player inputs
    switch (key) {
      case 'arrowleft':
        inputdown(INPUT.MOVE_LEFT)
        break
      case 'arrowright':
        inputdown(INPUT.MOVE_RIGHT)
        break
      case 'arrowup':
        inputdown(INPUT.MOVE_UP)
        break
      case 'arrowdown':
        inputdown(INPUT.MOVE_DOWN)
        break
      case 'enter':
        inputdown(INPUT.OK_BUTTON)
        break
      case 'esc':
      case 'escape':
        inputdown(INPUT.CANCEL_BUTTON)
        break
      case 'tab':
        inputdown(INPUT.MENU_BUTTON)
        break
      case 's':
        if (mods.ctrl) {
          vm_cli(SOFTWARE, '#save', registerreadplayer())
        }
        break
      case 't':
        if (mods.ctrl) {
          // open a join url in a new tab with a new session
        }
        break
      case 'o':
        if (mods.ctrl) {
          // open merge login request
        }
        break
      case 'f':
        if (mods.ctrl) {
          vm_cli(SOFTWARE, '#fork', registerreadplayer())
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
      inputdown(INPUT.ALT)
    } else {
      inputup(INPUT.ALT)
    }
    if (mods.ctrl) {
      inputdown(INPUT.CTRL)
    } else {
      inputup(INPUT.CTRL)
    }
    if (mods.shift) {
      inputdown(INPUT.SHIFT)
    } else {
      inputup(INPUT.SHIFT)
    }

    // keyboard built-in player inputs
    switch (key) {
      case 'meta':
        // special case for macos cmd + arrow keys
        inputup(INPUT.MOVE_LEFT)
        inputup(INPUT.MOVE_RIGHT)
        inputup(INPUT.MOVE_UP)
        inputup(INPUT.MOVE_DOWN)
        break
      case 'arrowleft':
        inputup(INPUT.MOVE_LEFT)
        break
      case 'arrowright':
        inputup(INPUT.MOVE_RIGHT)
        break
      case 'arrowup':
        inputup(INPUT.MOVE_UP)
        break
      case 'arrowdown':
        inputup(INPUT.MOVE_DOWN)
        break
      case 'enter':
        inputup(INPUT.OK_BUTTON)
        break
      case 'esc':
      case 'escape':
        inputup(INPUT.CANCEL_BUTTON)
        break
      case 'tab':
        inputup(INPUT.MENU_BUTTON)
        break
    }
  },
  { capture: true },
)

createdevice('userinput', ['tock'], (message) => {
  switch (message.target) {
    case 'up':
      if (isnumber(message.data)) {
        inputup(message.data)
      }
      break
    case 'down':
      if (isnumber(message.data)) {
        inputdown(message.data)
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
  [BUTTON_A]: INPUT.OK_BUTTON,
  [BUTTON_B]: INPUT.CANCEL_BUTTON,
  [BUTTON_X]: INPUT.OK_BUTTON,
  [BUTTON_Y]: INPUT.CANCEL_BUTTON,
  [BUTTON_LEFT_SHOULDER]: INPUT.ALT,
  [BUTTON_RIGHT_SHOULDER]: INPUT.CTRL,
  [BUTTON_LEFT_TRIGGER]: INPUT.SHIFT,
  [BUTTON_RIGHT_TRIGGER]: INPUT.SHIFT,
  [BUTTON_MENU]: INPUT.MENU_BUTTON,
  [BUTTON_UP]: INPUT.MOVE_UP,
  [BUTTON_DOWN]: INPUT.MOVE_DOWN,
  [BUTTON_LEFT]: INPUT.MOVE_LEFT,
  [BUTTON_RIGHT]: INPUT.MOVE_RIGHT,
}

type GamepadEvent = CustomEvent<IGamepadButtonEventDetail>

// @ts-expect-error added by gamepad helper
document.addEventListener('gamepadbuttondown', (event: GamepadEvent) => {
  inputdown(buttonlookup[event.detail.button])
})

// @ts-expect-error added by gamepad helper
document.addEventListener('gamepadbuttonup', (event: GamepadEvent) => {
  inputup(buttonlookup[event.detail.button])
})

// mouse && touch input - used to activate :tap labels

// components

const HOTKEY_EVENT = 'keyup'

type UserHotkeyProps = {
  hotkey: string
  children: () => void
}

export function UserHotkey({ hotkey, children }: UserHotkeyProps) {
  useEffect(() => {
    const invokecheck = isHotKey(hotkey, { byKey: true })
    function hotkeycheck(event: KeyboardEvent) {
      if (user.ignorehotkeys === false && invokecheck(event)) {
        children()
      }
    }
    document.addEventListener(HOTKEY_EVENT, hotkeycheck, false)
    return () => document.removeEventListener(HOTKEY_EVENT, hotkeycheck, false)
  }, [hotkey, children])

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
