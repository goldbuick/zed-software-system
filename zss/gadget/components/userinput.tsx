import mitt from 'mitt'
import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

// user input

export enum INPUT {
  MOVE_LEFT,
  MOVE_RIGHT,
  MOVE_UP,
  MOVE_DOWN,
  SHOOT_LEFT,
  SHOOT_RIGHT,
  SHOOT_UP,
  SHOOT_DOWN,
  OK_BUTTON,
  CANCEL_BUTTON,
  MENU_BUTTON,
}

type UserInputMods = {
  alt: boolean
  cmd: boolean
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
    cmd: isMac ? event.metaKey : event.ctrlKey,
    shift: event.shiftKey,
  }

  switch (key) {
    case 'arrowleft':
      invoke(event.shiftKey ? INPUT.SHOOT_LEFT : INPUT.MOVE_LEFT, mods)
      break
    case 'arrowright':
      invoke(event.shiftKey ? INPUT.SHOOT_RIGHT : INPUT.MOVE_RIGHT, mods)
      break
    case 'arrowup':
      invoke(event.shiftKey ? INPUT.SHOOT_UP : INPUT.MOVE_UP, mods)
      break
    case 'arrowdown':
      invoke(event.shiftKey ? INPUT.SHOOT_DOWN : INPUT.MOVE_DOWN, mods)
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
      root.emit('keydown', event)
      break
  }
})

// gamepad input

// mouse input

// touch input

// components

interface UserHotkeyProps {
  hotkey: string
  children: () => void
}

export function UserHotkey({ hotkey, children }: UserHotkeyProps) {
  useHotkeys(hotkey, children, {
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
  SHOOT_LEFT?: UserInputHandler
  SHOOT_RIGHT?: UserInputHandler
  SHOOT_UP?: UserInputHandler
  SHOOT_DOWN?: UserInputHandler
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
