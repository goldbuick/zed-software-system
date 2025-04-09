import { createdevice } from 'zss/device'
import { write } from 'zss/feature/writeui'
import {
  TAPE_DISPLAY,
  TAPE_LOG_LEVEL,
  TAPE_MAX_LINES,
  TAPE_ROW,
  useTape,
} from 'zss/gadget/data/state'
import { pickwith } from 'zss/mapping/array'
import { doasync } from 'zss/mapping/func'
import { createsid } from 'zss/mapping/guid'
import { waitfor } from 'zss/mapping/tick'
import { isarray, isboolean, ispresent } from 'zss/mapping/types'

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
  const row: TAPE_ROW = [
    createsid(),
    message.target,
    pickwith(message.sender, messagecrew),
    ...message.data,
  ]
  if (isarray(message.data) && message.data.length === 0) {
    debugger
  }

  let logs: TAPE_ROW[] = [row, ...terminal.logs]
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

const tape = createdevice('tape', ['info', 'debug', 'error'], (message) => {
  if (!tape.session(message)) {
    return
  }
  const { terminal } = useTape.getState()
  switch (message.target) {
    case 'inspector':
      if (message.player === registerreadplayer()) {
        useTape.setState((state) => {
          const enabled = ispresent(message.data)
            ? !!message.data
            : !state.inspector

          write(
            tape,
            message.player,
            `gadget inspector ${enabled ? '$greenon' : '$redoff'}`,
          )
          if (enabled) {
            write(
              tape,
              message.player,
              `mouse click or tap elements to inspect`,
            )
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
        // eslint-disable-next-line no-console
        console.debug(terminallog(message))
      }
      break
    case 'error':
      if (terminal.level > TAPE_LOG_LEVEL.OFF) {
        terminaladdmessage(message)
      }
      console.error(terminallog(message))
      break
    case 'toast':
      doasync(tape, message.player, async () => {
        if (ispresent(message.data)) {
          const hold = Math.min(
            Math.max(message.data.length * 150, 3000),
            14000,
          )
          useTape.setState({ toast: message.data })
          await waitfor(hold)
          useTape.setState({ toast: '' })
        }
      })
      break
    case 'terminal:full':
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
    case 'terminal:quickopen':
      if (message.player === registerreadplayer()) {
        useTape.setState({
          quickterminal: true,
        })
      }
      break
    case 'terminal:close':
      if (message.player === registerreadplayer()) {
        useTape.setState((state) => ({
          quickterminal: false,
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
      if (isarray(message.data)) {
        const { player } = message
        const [book, path, type, title, refsheet] = message.data
        useTape.setState((state) => ({
          editor: {
            open: true,
            player,
            book,
            path,
            type,
            title,
            refsheet: refsheet.length ? refsheet : state.editor.refsheet,
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
