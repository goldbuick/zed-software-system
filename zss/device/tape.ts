import { proxy, useSnapshot } from 'valtio'
import { LOG_DEBUG } from 'zss/config'
import { createdevice } from 'zss/device'
import { createsid } from 'zss/mapping/guid'
import { isarray, isboolean } from 'zss/mapping/types'

// system wide message logger

export enum TAPE_DISPLAY {
  TOP,
  BOTTOM,
  FULL,
  SPLIT_X,
  SPLIT_X_ALT,
  SPLIT_Y,
  SPLIT_Y_ALT,
  RIGHT,
  LEFT,
  MAX,
}

export enum TAPE_LOG_LEVEL {
  OFF,
  INFO,
  DEBUG,
}

type TAPE_ROW = [string, string, string, ...any[]]

type TAPE_STATE = {
  layout: TAPE_DISPLAY
  terminal: {
    open: boolean
    level: TAPE_LOG_LEVEL
    logs: TAPE_ROW[]
  }
  editor: {
    open: boolean
    player: string
    book: string
    page: string
    type: string
    title: string
  }
}

// message controlled state
const tape = proxy<TAPE_STATE>({
  layout: TAPE_DISPLAY.BOTTOM,
  terminal: {
    open: false,
    level: LOG_DEBUG ? TAPE_LOG_LEVEL.DEBUG : TAPE_LOG_LEVEL.INFO,
    logs: [],
  },
  editor: {
    open: false,
    player: '',
    book: '',
    page: '',
    type: '',
    title: '',
  },
})

function terminalinclayout(inc: boolean) {
  const step = inc ? 1 : -1
  tape.layout = ((tape.layout as number) + step) as TAPE_DISPLAY
  if ((tape.layout as number) < 0) {
    tape.layout += TAPE_DISPLAY.MAX
  }
  if ((tape.layout as number) >= (TAPE_DISPLAY.MAX as number)) {
    tape.layout -= TAPE_DISPLAY.MAX
  }
  if (!tape.editor.open) {
    switch (tape.layout) {
      case TAPE_DISPLAY.SPLIT_X:
      case TAPE_DISPLAY.SPLIT_Y:
      case TAPE_DISPLAY.SPLIT_X_ALT:
      case TAPE_DISPLAY.SPLIT_Y_ALT:
        terminalinclayout(inc)
        break
    }
  }
}

export function useTape() {
  return useSnapshot(tape)
}

createdevice('tape', [], (message) => {
  function addmessage() {
    tape.terminal.logs.unshift([
      createsid(),
      message.target,
      message.sender,
      ...message.data,
    ])
  }

  switch (message.target) {
    case 'info':
      if (tape.terminal.level >= TAPE_LOG_LEVEL.INFO) {
        addmessage()
      }
      break
    case 'debug':
      if (tape.terminal.level >= TAPE_LOG_LEVEL.DEBUG) {
        addmessage()
      }
      break
    case 'error':
      if (tape.terminal.level > TAPE_LOG_LEVEL.OFF) {
        addmessage()
      }
      break
    case 'crash':
      tape.terminal.open = true
      tape.layout = TAPE_DISPLAY.FULL
      break
    case 'terminal:open':
      tape.terminal.open = true
      break
    case 'terminal:close':
      tape.terminal.open = false
      break
    case 'terminal:inclayout':
      if (isboolean(message.data)) {
        terminalinclayout(message.data)
      }
      break
    case 'editor:open':
      if (isarray(message.data)) {
        const [book, page, type, title] = message.data ?? ['', '', '']
        tape.terminal.open = true
        tape.editor.open = true
        tape.editor.player = message.player ?? ''
        tape.editor.book = book
        tape.editor.page = page
        tape.editor.type = type
        tape.editor.title = title
      }
      break
    case 'editor:close':
      tape.editor.open = false
      break
  }
})
