import mitt from 'mitt'
import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

import { INPUT } from '../data/types'

// user input

export type UserInputMods = {
  alt: boolean
  ctrl: boolean
  shift: boolean
}

// focus

let root = mitt()
let ignorehotkeys = false
export const UserInputContext = createContext(root)

function invoke(input: INPUT, mods: UserInputMods) {
  root.emit(INPUT[input], mods)
}

// keyboard input
export type KeyboardInputHandler = (event: KeyboardEvent) => void

const isMac = window.navigator.userAgent.indexOf('Mac') !== -1

document.addEventListener('keydown', (event) => {
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
      root.emit('keydown', event)
      break
  }
})

// gamepad input
// yes

// mouse input ??
// touch input ??

// components

interface UserHotkeyProps {
  hotkey: string
  children: () => void
}

export function UserHotkey({ hotkey, children }: UserHotkeyProps) {
  useHotkeys(hotkey.replaceAll('ctrl', isMac ? 'meta' : 'ctrl'), children, {
    enabled() {
      return ignorehotkeys === false
    },
  })
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
    const old = root
    const oldconfig = ignorehotkeys
    root = current
    ignorehotkeys = !!blockhotkeys

    return () => {
      root = old
      ignorehotkeys = oldconfig
    }
  }, [])

  return (
    <UserInputContext.Provider value={current}>
      {children}
    </UserInputContext.Provider>
  )
}
