import { proxy, useSnapshot } from 'valtio'
import { LOG_DEBUG } from 'zss/config'
import { createdevice } from 'zss/device'
import { createsid } from 'zss/mapping/guid'
import { isnumber } from 'zss/mapping/types'

// system wide message logger

export enum TAPE_DISPLAY {
  TOP,
  BOTTOM,
  RIGHT,
  LEFT,
  FULL,
  MAX,
}

export enum TAPE_LOG_LEVEL {
  OFF,
  INFO,
  DEBUG,
}

type TAPE_ROW = [string, string, string, ...any[]]

type TAPE_STATE = {
  // terminal state
  open: boolean
  display: TAPE_DISPLAY
  logs: TAPE_ROW[]
  loglevel: TAPE_LOG_LEVEL
  // editor state
  editopen: boolean
  editbook: string
  editpage: string
}

const tape = proxy<TAPE_STATE>({
  // terminal state
  open: false,
  display: TAPE_DISPLAY.BOTTOM,
  logs: [],
  loglevel: LOG_DEBUG ? TAPE_LOG_LEVEL.DEBUG : TAPE_LOG_LEVEL.INFO,
  // editor state
  editopen: false,
  editbook: '',
  editpage: '',
})

function tapeincdisplay(inc: number) {
  tape.display = ((tape.display as number) + inc) as TAPE_DISPLAY
  if ((tape.display as number) < 0) {
    tape.display += TAPE_DISPLAY.MAX
  }
  if ((tape.display as number) >= (TAPE_DISPLAY.MAX as number)) {
    tape.display -= TAPE_DISPLAY.MAX
  }
}

export function useTape() {
  return useSnapshot(tape)
}

createdevice('tape', [], (message) => {
  function addmessage() {
    tape.logs.unshift([
      createsid(),
      message.target,
      message.sender,
      ...message.data,
    ])
  }

  switch (message.target) {
    case 'info':
      if (tape.loglevel >= TAPE_LOG_LEVEL.INFO) {
        addmessage()
      }
      break
    case 'debug':
      if (tape.loglevel >= TAPE_LOG_LEVEL.DEBUG) {
        addmessage()
      }
      break
    case 'error':
      if (tape.loglevel > TAPE_LOG_LEVEL.OFF) {
        addmessage()
      }
      break
    case 'open':
      tape.open = true
      break
    case 'close':
      tape.open = false
      break
    case 'incdisplay':
      if (isnumber(message.data)) {
        tapeincdisplay(message.data)
      }
      break
    case 'crash':
      tape.open = true
      tape.display = TAPE_DISPLAY.FULL
      break
    case 'editopen': {
      const [editbook, editpage] = message.data ?? ['', '']
      tape.editbook = editbook
      tape.editpage = editpage
      tape.editopen = true
      break
    }
    case 'editclose':
      tape.editopen = false
      break
  }
})
