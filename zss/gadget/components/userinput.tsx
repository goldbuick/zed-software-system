import isHotKey from 'is-hotkey'
import mitt from 'mitt'
import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

import { INPUT } from '../data/types'

// user input

export type UserInputMods = {
  alt: boolean
  ctrl: boolean
  shift: boolean
}

// focus

const user = {
  root: mitt(),
  ignorehotkeys: false,
}
export const UserInputContext = createContext(user.root)

function invoke(input: INPUT, mods: UserInputMods) {
  user.root.emit(INPUT[input], mods)
}

// keyboard input
export type KeyboardInputHandler = (event: KeyboardEvent) => void

const isMac = window.navigator.userAgent.indexOf('Mac') !== -1

document.addEventListener(
  'keydown',
  (event) => {
    event.preventDefault()

    const key = event.key.toLowerCase()
    const mods: UserInputMods = {
      alt: event.altKey,
      ctrl: isMac ? event.metaKey : event.ctrlKey,
      shift: event.shiftKey,
    }

    switch (key) {
      case 'arrowleft':
        invoke(INPUT.MOVE_LEFT, mods)
        break
      case 'arrowright':
        invoke(INPUT.MOVE_RIGHT, mods)
        break
      case 'arrowup':
        invoke(INPUT.MOVE_UP, mods)
        break
      case 'arrowdown':
        invoke(INPUT.MOVE_DOWN, mods)
        break
      case 'enter':
        invoke(INPUT.OK_BUTTON, mods)
        break
      case 'esc':
      case 'escape':
        invoke(INPUT.CANCEL_BUTTON, mods)
        break
      case 'tab':
        invoke(INPUT.MENU_BUTTON, mods)
        break
      default:
        // we should have gamepad input that moves between hotkey inputs,
        // which then can be activated with the ok button
        // maybe d-pad ?
        user.root.emit('keydown', event)
        break
    }
  },
  { capture: true },
)

// gamepad input
// yes

// mouse input ??
// touch input ??

// components

interface UserHotkeyProps {
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

interface UserInputProps {
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
  const deps = [...Object.keys(events), ...Object.values(events)]

  useEffect(() => {
    const list = Object.entries(events)

    list.forEach(([key, value]) => context.on(key, value))
    return () => {
      list.forEach(([key, value]) => context.off(key, value))
    }
  }, deps)

  return null
}

interface UserFocusProps {
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
  }, [])

  return (
    <UserInputContext.Provider value={current}>
      {children}
    </UserInputContext.Provider>
  )
}
