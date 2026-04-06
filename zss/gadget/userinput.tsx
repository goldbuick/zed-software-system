/* eslint-disable react-refresh/only-export-components */
// @ts-expect-error yes
import { GamepadListener } from 'gamepad.js'
import isHotKey from 'is-hotkey'
import mitt from 'mitt'
import { ReactNode, useEffect, useState } from 'react'
import { objectKeys } from 'ts-extras'
import { createdevice } from 'zss/device'
import {
  apilog,
  registerbookmarkclirun,
  vmcli,
  vmdoot,
  vminput,
  vmlocal,
  vmrefscroll,
} from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { useTape } from 'zss/gadget/data/state'
import {
  INPUT,
  INPUT_ALT,
  INPUT_CTRL,
  INPUT_SHIFT,
} from 'zss/gadget/data/types'
import { UserInputContext, user } from 'zss/gadget/userinputcontext'
import type { UserInputMods } from 'zss/gadget/userinputtypes'
import { isnumber, ispresent } from 'zss/mapping/types'
import { perfmeasure } from 'zss/perf/ui'
import { dirfromdelta } from 'zss/words/dir'
import { ismac } from 'zss/words/system'
import { DIR, NAME } from 'zss/words/types'

import {
  type Mobiletextfield,
  getmobiletextelement,
  mobiletextfocus,
  onmobiletextinput,
} from './mobiletext'

export {
  getmobiletextelement,
  mobiletextfocus,
  onmobiletextinput,
}
export type { MobiletextInputCallback } from './mobiletext'

// user input

type INPUT_STATE = Record<INPUT, boolean>

export type {
  UserInputMods,
  UserInputProps,
  UserInputHandler,
  KeyboardInputHandler,
} from 'zss/gadget/userinputtypes'
export { UserInput } from 'zss/gadget/userinput.bridge'

const inputstates: Record<number, INPUT_STATE> = {}
function playerlocal(index: number) {
  return `${registerreadplayer()}local${index}`
}

// keep alive ping every 10 seconds
const DOOT_RATE = 10 * 100

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

  // this is the doot source
  if (localtick > DOOT_RATE) {
    localtick = 0
    const idx = objectKeys(inputstates)
    // skip main player
    for (let i = 1; i < idx.length; ++i) {
      const index = parseFloat(idx[i])
      vmdoot(SOFTWARE, playerlocal(index))
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

export function inputdown(index: number, input: INPUT) {
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

export function inputup(index: number, input: INPUT) {
  const inputstate = readinput(index)
  inputstate[input] = false
}

// focus

export { UserInputContext }

// keyboard input

export function modsfromevent(event: KeyboardEvent): UserInputMods {
  return {
    alt: event.altKey,
    ctrl: ismac ? event.metaKey : event.ctrlKey,
    shift: event.shiftKey,
  }
}

function userinputinvoke(index: number, input: INPUT, mods: UserInputMods) {
  perfmeasure('input:userinputinvoke', () => {
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
      vminput(SOFTWARE, player, input, bits)
    }
  })
}

function handlekeydown(event: KeyboardEvent) {
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
    case 'a':
    case 'p':
    case 'h':
    case 'k':
    case 'b':
    case 'n': // prevent default behavior
    case '[':
    case ']':
    case '0':
    case '1':
    case '2':
    case '3':
    case '4':
    case '5':
    case '6':
    case '7':
    case '8':
    case '9':
    case 'delete':
    case 'backspace':
      if (mods.alt || mods.ctrl || mods.shift) {
        event.preventDefault()
      }
      break
    case 'tab':
    case 'arrowleft':
    case 'arrowright':
    case 'arrowup':
    case 'arrowdown':
    case `'`:
    case '"':
    case '/':
      // << for firefox :<
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
      if (event.metaKey) {
        inputup(0, INPUT.MOVE_LEFT)
      }
      break
    case 'arrowright':
      inputdown(0, INPUT.MOVE_RIGHT)
      if (event.metaKey) {
        inputup(0, INPUT.MOVE_RIGHT)
      }
      break
    case 'arrowup':
      inputdown(0, INPUT.MOVE_UP)
      if (event.metaKey) {
        inputup(0, INPUT.MOVE_UP)
      }
      break
    case 'arrowdown':
      inputdown(0, INPUT.MOVE_DOWN)
      if (event.metaKey) {
        inputup(0, INPUT.MOVE_DOWN)
      }
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
        vmcli(SOFTWARE, player, '#save')
      }
      break
    case 'j':
      if (mods.ctrl) {
        vmcli(SOFTWARE, player, mods.shift ? '#jointab hush' : '#jointab')
      }
      break
    case 'o':
      if (mods.ctrl) {
        vmcli(SOFTWARE, player, mods.shift ? '#joincode hush' : '#joincode')
      }
      break
    case 'l':
      if (mods.ctrl) {
        // open merge login request
      }
      break
    case 'k':
      if (mods.ctrl) {
        vmcli(SOFTWARE, player, '#fork')
      }
      break
    case 'h':
      if (mods.ctrl) {
        vmrefscroll(SOFTWARE, player)
      }
      break
    case '1':
    case '2':
    case '3':
    case '4':
    case '5':
    case '6':
      if (mods.ctrl) {
        const pinids = useTape.getState().terminal.pinids
        const index = parseInt(key, 10) - 1
        const id = pinids[index]
        if (ispresent(id)) {
          registerbookmarkclirun(SOFTWARE, player, id)
        }
      }
      break
  }
  user.root.emit('keydown', event)
}

function handlekeyup(event: KeyboardEvent) {
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
}

/**
 * Capture-phase key routing from the hidden mobile text field into `handlekeydown` / `handlekeyup`.
 * Call from `bootstrapmobiletextcapture`; cleanup on unmount. Enter is passed through for textarea
 * when the editor is open so `\n` can be inserted.
 */
export function setupmobiletextkeyboardlisteners(
  element: Mobiletextfield,
): () => void {
  function editoropen() {
    return useTape.getState().editor.open
  }
  function onkeydowncapture(event: Event) {
    const ev = event as KeyboardEvent
    if (ev.target !== element) {
      return
    }
    const key = NAME(ev.key)
    // Textarea + editor: allow default Enter so `\n` is inserted; `onmobiletextinput` syncs.
    if (
      element instanceof HTMLTextAreaElement &&
      editoropen() &&
      key === 'enter'
    ) {
      ev.stopPropagation()
      return
    }
    ev.preventDefault()
    ev.stopPropagation()
    handlekeydown(ev)
  }
  function onkeyupcapture(event: Event) {
    const ev = event as KeyboardEvent
    if (ev.target !== element) {
      return
    }
    const key = NAME(ev.key)
    if (
      element instanceof HTMLTextAreaElement &&
      editoropen() &&
      key === 'enter'
    ) {
      ev.stopPropagation()
      return
    }
    ev.preventDefault()
    ev.stopPropagation()
    handlekeyup(ev)
  }
  element.addEventListener('keydown', onkeydowncapture, { capture: true })
  element.addEventListener('keyup', onkeyupcapture, { capture: true })
  return () => {
    element.removeEventListener('keydown', onkeydowncapture, { capture: true })
    element.removeEventListener('keyup', onkeyupcapture, { capture: true })
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault()
    },
    { passive: false },
  )

  window.addEventListener(
    'keydown',
    (event) => {
      const captureel = getmobiletextelement()
      if (captureel && event.target === captureel) {
        return
      }
      handlekeydown(event)
    },
    { capture: true },
  )

  window.addEventListener(
    'keyup',
    (event) => {
      const captureel = getmobiletextelement()
      if (captureel && event.target === captureel) {
        return
      }
      handlekeyup(event)
    },
    { capture: true },
  )

  window.addEventListener('blur', () => {
    inputup(0, INPUT.ALT)
    inputup(0, INPUT.CTRL)
    inputup(0, INPUT.SHIFT)
    inputup(0, INPUT.MOVE_UP)
    inputup(0, INPUT.MOVE_DOWN)
    inputup(0, INPUT.MOVE_LEFT)
    inputup(0, INPUT.MOVE_RIGHT)
    inputup(0, INPUT.OK_BUTTON)
    inputup(0, INPUT.CANCEL_BUTTON)
    inputup(0, INPUT.MENU_BUTTON)
  })
}

createdevice('userinput', [], (message) => {
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
  [BUTTON_LEFT_SHOULDER]: INPUT.CANCEL_BUTTON,
  [BUTTON_RIGHT_SHOULDER]: INPUT.OK_BUTTON,
  [BUTTON_LEFT_TRIGGER]: INPUT.ALT,
  [BUTTON_RIGHT_TRIGGER]: INPUT.CTRL,
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
  apilog(SOFTWARE, player, `connected ${event.detail.gamepad.id}`)
  readinput(event.detail.index)
  if (event.detail.index > 0) {
    vmlocal(SOFTWARE, playerlocal(event.detail.index))
  }
})
gamepads.on('gamepad:disconnected', (event: any) => {
  const player = registerreadplayer()
  apilog(SOFTWARE, player, `disconnected gamepad ${event.detail.index}`)
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
        inputdown(index, INPUT.SHIFT)
        inputdown(index, buttonlookup[event.detail.button])
      } else {
        inputup(index, INPUT.SHIFT)
      }
      break
    default: {
      const mapped = buttonlookup[event.detail.button]
      if (mapped === undefined) {
        break
      }
      if (event.detail.value) {
        inputdown(index, mapped)
      } else {
        inputup(index, mapped)
      }
      break
    }
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
