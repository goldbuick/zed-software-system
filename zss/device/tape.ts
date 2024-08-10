import { proxy, useSnapshot } from 'valtio'
import { LOG_DEBUG } from 'zss/config'
import { createdevice } from 'zss/device'
import { createsid } from 'zss/mapping/guid'
import { clamp } from 'zss/mapping/number'
import { isarray, isnumber } from 'zss/mapping/types'

// system wide message logger

export enum TAPE_DISPLAY {
  TOP,
  BOTTOM,
  FULL,
  SPLIT_X,
  SPLIT_Y,
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
  terminal: {
    open: boolean
    layout: TAPE_DISPLAY
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
  terminal: {
    open: false,
    layout: TAPE_DISPLAY.BOTTOM,
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
  tape.terminal.layout = ((tape.terminal.layout as number) +
    step) as TAPE_DISPLAY
  if ((tape.terminal.layout as number) < 0) {
    tape.terminal.layout += TAPE_DISPLAY.MAX
  }
  if ((tape.terminal.layout as number) >= (TAPE_DISPLAY.MAX as number)) {
    tape.terminal.layout -= TAPE_DISPLAY.MAX
  }
  if (
    !tape.terminal.open &&
    (tape.terminal.layout === TAPE_DISPLAY.SPLIT_X ||
      tape.terminal.layout === TAPE_DISPLAY.SPLIT_Y)
  ) {
    terminalinclayout(inc)
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
      tape.terminal.layout = TAPE_DISPLAY.FULL
      break
    case 'terminal:open':
      tape.terminal.open = true
      break
    case 'terminal:close':
      tape.terminal.open = false
      break
    case 'terminal:inclayout':
      if (isnumber(message.data)) {
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
