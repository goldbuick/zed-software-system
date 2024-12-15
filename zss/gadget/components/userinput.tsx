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
import { vm_cli } from 'zss/device/api'
import { getgadgetclientplayer } from 'zss/gadget/data/state'
import { INPUT } from 'zss/gadget/data/types'
import { ismac } from 'zss/words/system'

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

function inputdown(input: INPUT) {
  // make sure to trigger input event
  if (!inputstate[input]) {
    invoke(input, {
      alt: inputstate[INPUT.ALT],
      ctrl: inputstate[INPUT.CTRL],
      shift: inputstate[INPUT.SHIFT],
    })
  }
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

function invoke(input: INPUT, mods: UserInputMods) {
  user.root.emit(INPUT[input], mods)
}

document.addEventListener(
  'keydown',
  (event) => {
    const key = event.key.toLowerCase()
    const mods = modsfromevent(event)

    // allowed shortcuts, all others we attempt to block
    // paste ; Ctrl + V / Cmd + V
    // refresh page : Ctrl + R / Cmd + R
    // open / close devtools : Ctrl + Shift + I / Cmd + Alt + I
    // open / close js console : Ctrl + Shift + J / Cmd + Alt + J
    // save ; Ctrl + S
    switch (key) {
      case 's':
        if (mods.ctrl) {
          vm_cli('tape', '#save', getgadgetclientplayer())
        }
        event.preventDefault()
        break
      case 'v':
      case 'r':
        if (mods.ctrl) {
          // no-op
        } else {
          event.preventDefault()
        }
        break
      case 'i':
        if (!ismac && mods.shift && mods.ctrl) {
          // no-op
        } else {
          event.preventDefault()
        }
        break
      case 'dead':
        if (ismac && mods.alt && mods.ctrl) {
          // no-op
        } else {
          event.preventDefault()
        }
        break
      case 'alt':
      case 'meta':
      case 'shift':
      case 'control':
        // no-op
        break
      default:
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
    }

    // always invoke keydown
    // we should have gamepad input that moves between hotkey inputs,
    // which then can be activated with the ok button
    // maybe d-pad ?
    user.root.emit('keydown', event)
  },
  { capture: true },
)

document.addEventListener(
  'keyup',
  (event) => {
    const key = event.key.toLowerCase()
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

// gamepad input
document.addEventListener(
  'gamepadbuttondown',
  (event: CustomEvent<IGamepadButtonEventDetail>) => {
    // inputdown(event.button)
  },
)

document.addEventListener(
  'gamepadbuttonup',
  (event: CustomEvent<IGamepadButtonEventDetail>) => {
    // inputup(event.button)
  },
)

// mouse && touch input - used to activate :tap labels

// components

type UserHotkeyProps = {
  hotkey: string
  children: () => void
}

const HOTKEY_EVENT = 'keyup'

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
