import { createdevice } from 'zss/device'
import {
  TAPE_DISPLAY,
  TAPE_LOG_LEVEL,
  TAPE_MAX_LINES,
  TAPE_ROW,
  useTape,
} from 'zss/gadget/data/state'
import { pickwith } from 'zss/mapping/array'
import { createsid } from 'zss/mapping/guid'
import { isarray, isboolean, ispresent } from 'zss/mapping/types'
import { write } from 'zss/words/writeui'

import { MESSAGE } from './api'
import { registerreadplayer } from './register'

const messagecrew: string[] = [
  '$brown$153',
  '$purple$5',
  '$green$42',
  '$ltgray$94',
  '$white$24',
  '$white$25',
  '$white$26',
  '$white$27',
  '$white$16',
  '$white$17',
  '$white$30',
  '$white$31',
  '$red$234',
  '$cyan$227',
  '$dkpurple$227',
]

function terminallog(message: MESSAGE): string {
  if (isarray(message.data)) {
    return [message.sender, ...message.data.map((v) => `${v}`)].join(' ')
  }
  return ''
}

function terminaladdmessage(message: MESSAGE) {
  const { terminal } = useTape.getState()
  let logs: TAPE_ROW[] = [
    [
      createsid(),
      message.target,
      pickwith(message.sender, messagecrew),
      ...message.data,
    ],
    ...terminal.logs,
  ]
  if (logs.length > TAPE_MAX_LINES) {
    logs = logs.slice(0, TAPE_MAX_LINES)
  }
  useTape.setState((state) => ({
    terminal: {
      ...state.terminal,
      logs,
    },
  }))
}

function terminalinclayout(inc: boolean) {
  const { layout, editor } = useTape.getState()
  const step = inc ? 1 : -1
  let nextlayout = (layout as number) + step
  if (nextlayout < 0) {
    nextlayout += TAPE_DISPLAY.MAX
  }
  if (nextlayout >= (TAPE_DISPLAY.MAX as number)) {
    nextlayout -= TAPE_DISPLAY.MAX
  }
  if (!editor.open) {
    switch (nextlayout as TAPE_DISPLAY) {
      case TAPE_DISPLAY.SPLIT_Y:
      case TAPE_DISPLAY.SPLIT_Y_ALT:
        // skip over these to right
        nextlayout = TAPE_DISPLAY.TOP
        break
    }
  }
  useTape.setState({ layout: nextlayout })
}

const tape = createdevice('tape', [], (message) => {
  if (!tape.session(message)) {
    return
  }
  const { terminal } = useTape.getState()
  switch (message.target) {
    case 'inspector':
      if (message.player === registerreadplayer()) {
        useTape.setState((state) => {
          const enabled = !state.inspector
          write(tape, `gadget inspector ${enabled ? '$greenon' : '$redoff'}`)
          if (enabled) {
            write(tape, `mouse click or tap elements to inspect`)
          }
          return {
            inspector: enabled,
          }
        })
      }
      break
    case 'info':
      if (terminal.level >= TAPE_LOG_LEVEL.INFO) {
        terminaladdmessage(message)
      }
      break
    case 'debug':
      if (terminal.level >= TAPE_LOG_LEVEL.DEBUG) {
        terminaladdmessage(message)
      }
      break
    case 'error':
      if (terminal.level > TAPE_LOG_LEVEL.OFF) {
        terminaladdmessage(message)
      }
      console.error(terminallog(message))
      break
    case 'crash':
      useTape.setState((state) => ({
        layout: TAPE_DISPLAY.FULL,
        terminal: {
          ...state.terminal,
          open: true,
        },
      }))
      break
    case 'terminal:open':
      if (message.player === registerreadplayer()) {
        useTape.setState((state) => ({
          terminal: {
            ...state.terminal,
            open: true,
          },
        }))
      }
      break
    case 'terminal:close':
      if (message.player === registerreadplayer()) {
        useTape.setState((state) => ({
          terminal: {
            ...state.terminal,
            open: false,
          },
        }))
      }
      break
    case 'terminal:toggle':
      if (message.player === registerreadplayer()) {
        useTape.setState((state) => ({
          terminal: {
            ...state.terminal,
            open: !state.terminal.open,
          },
        }))
      }
      break
    case 'terminal:inclayout':
      if (message.player === registerreadplayer() && isboolean(message.data)) {
        terminalinclayout(message.data)
      }
      break
    case 'editor:open':
      if (isarray(message.data) && ispresent(message.player)) {
        const { player } = message
        const [book, page, type, title] = message.data ?? ['', '', '']
        useTape.setState((state) => ({
          terminal: {
            ...state.terminal,
            open: true,
          },
          editor: {
            open: true,
            player,
            book,
            page,
            type,
            title,
          },
        }))
      }
      break
    case 'editor:close':
      useTape.setState((state) => ({
        editor: {
          ...state.editor,
          open: false,
        },
      }))
      break
  }
})
