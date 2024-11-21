import { MESSAGE } from 'zss/chip'
import { createdevice } from 'zss/device'
import {
  TAPE_DISPLAY,
  TAPE_LOG_LEVEL,
  TAPE_MAX_LINES,
  TAPE_ROW,
  useTape,
} from 'zss/gadget/data/state'
import { createsid } from 'zss/mapping/guid'
import { isarray, isboolean, ispresent } from 'zss/mapping/types'

createdevice('tape', [], (message) => {
  const { layout, terminal, editor } = useTape.getState()

  function terminaladdmessage(message: MESSAGE) {
    let logs: TAPE_ROW[] = [
      [createsid(), message.target, message.sender, ...message.data],
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
        case TAPE_DISPLAY.SPLIT_X:
        case TAPE_DISPLAY.SPLIT_Y:
        case TAPE_DISPLAY.SPLIT_X_ALT:
        case TAPE_DISPLAY.SPLIT_Y_ALT:
          // skip over these to right
          nextlayout = TAPE_DISPLAY.RIGHT
          break
      }
    }
    useTape.setState({ layout: nextlayout })
  }

  switch (message.target) {
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
      useTape.setState((state) => ({
        terminal: {
          ...state.terminal,
          open: true,
        },
      }))
      break
    case 'terminal:close':
      useTape.setState((state) => ({
        terminal: {
          ...state.terminal,
          open: false,
        },
      }))
      break
    case 'terminal:inclayout':
      if (isboolean(message.data)) {
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
