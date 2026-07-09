import type { MESSAGE } from 'zss/device/api'
import {
  TAPE_MAX_LINES,
  useTape,
  useTerminal,
} from 'zss/gadget/data/zustandstores'
import { ispresent, isstring } from 'zss/mapping/types'
import { tokenizeandstriptextformat } from 'zss/words/textformat'

const countregex = /\((\d+)\)/

function renderrow(content: string[]) {
  if (!content || !Array.isArray(content)) {
    return ''
  }
  const messagetext = content.map((v) => `${v}`).join(' ')
  const ishyperlink = messagetext.startsWith('!')
  if (ishyperlink) {
    return `!${messagetext}`
  }
  return `$onclear$blue${messagetext}`
}

export function terminaladdlog(message: MESSAGE): void {
  const { terminal } = useTape.getState()
  const row = renderrow(message.data)
  const rowplain = tokenizeandstriptextformat(row)
    .replace(countregex, '')
    .trim()
  if (!rowplain.length) {
    return
  }
  const [firstrow = ''] = terminal.logs
  const logs = [...terminal.logs]

  const firstrowplain = tokenizeandstriptextformat(firstrow).replace(
    countregex,
    '',
  )

  const dupecheck = firstrowplain.indexOf(rowplain)
  if (rowplain.length && firstrowplain.length && dupecheck === 0) {
    const countcheck = countregex.exec(firstrow)
    if (ispresent(countcheck)) {
      const newcount = parseFloat(countcheck[1]) + 1
      logs.shift()
      logs.unshift(`(${newcount})${row}`)
    } else {
      logs.shift()
      logs.unshift(`(2)${row}`)
    }
  } else {
    while (logs.length >= TAPE_MAX_LINES) {
      logs.pop()
    }
    logs.unshift(row)
    if (useTerminal.getState().ycursor > 0) {
      useTerminal.setState((state) => {
        return {
          ycursor: state.ycursor + 1,
          yselect: state.yselect ? state.yselect + 1 : undefined,
        }
      })
    }
  }

  useTape.setState((state) => ({
    terminal: {
      ...state.terminal,
      logs,
    },
  }))
  const nodelog = (window as { __nodeLog?: (line: string) => void }).__nodeLog
  if (typeof nodelog === 'function' && isstring(row)) {
    nodelog(row)
  }
}
