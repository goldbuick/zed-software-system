import { createdevice } from "zss/device"



createdevice('', [], (message) => {
  switch (message.target) {
    case 'info':
      if (tape.terminal.level >= TAPE_LOG_LEVEL.INFO) {
        terminaladdmessage(message)
      }
      break
    case 'debug':
      if (tape.terminal.level >= TAPE_LOG_LEVEL.DEBUG) {
        terminaladdmessage(message)
      }
      break
    case 'error':
      if (tape.terminal.level > TAPE_LOG_LEVEL.OFF) {
        terminaladdmessage(message)
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
