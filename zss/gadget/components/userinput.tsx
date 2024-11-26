/* eslint-disable react-refresh/only-export-components */
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

import { getgadgetclientplayer } from '../data/state'
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

export const ismac = navigator.userAgent.indexOf('Mac') !== -1
export const metakey = ismac ? 'cmd' : 'ctrl'

export function modsfromevent(event: KeyboardEvent): UserInputMods {
  return {
    alt: event.altKey,
    ctrl: ismac ? event.metaKey : event.ctrlKey,
    shift: event.shiftKey,
  }
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

    // keyboard built-in player inputs
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
    }

    // always invoke keydown
    // we should have gamepad input that moves between hotkey inputs,
    // which then can be activated with the ok button
    // maybe d-pad ?
    user.root.emit('keydown', event)
  },
  { capture: true },
)

// gamepad input
// yes

// mouse input ??
// touch input ??

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
