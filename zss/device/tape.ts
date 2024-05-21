import { proxy, useSnapshot } from 'valtio'
import { createdevice } from 'zss/device'
import { createguid } from 'zss/mapping/guid'
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
  open: boolean
  mode: TAPE_DISPLAY
  logs: TAPE_ROW[]
  loglevel: TAPE_LOG_LEVEL
}

const tape: TAPE_STATE = proxy({
  open: false,
  mode: TAPE_DISPLAY.BOTTOM,
  logs: [],
  loglevel: TAPE_LOG_LEVEL.INFO,
})

export function tapesetopen(open: boolean) {
  tape.open = open
}

export function tapesetmode(inc: number) {
  tape.mode = ((tape.mode as number) + inc) as TAPE_DISPLAY
  if ((tape.mode as number) < 0) {
    tape.mode += TAPE_DISPLAY.MAX
  }
  if ((tape.mode as number) >= (TAPE_DISPLAY.MAX as number)) {
    tape.mode -= TAPE_DISPLAY.MAX
  }
}

export function useTape() {
  return useSnapshot(tape)
}

createdevice('tape', [], (message) => {
  function addmessage() {
    tape.logs.unshift([
      createguid(),
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
      if (isnumber(message.data)) {
        tapesetopen(true)
        tapesetmode(message.data)
      }
      break
  }
})
