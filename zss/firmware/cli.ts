import { proxy } from 'valtio'
import { maptostring } from 'zss/chip'
import { api_error, tape_info } from 'zss/device/api'
import { createfirmware } from 'zss/firmware'
import { createname } from 'zss/mapping/guid'
import { ispresent, isstring } from 'zss/mapping/types'
import {
  memoryreadbook,
  memoryreadbooklist,
  memoryreadchip,
  memoryreadcontext,
  memorysetbook,
} from 'zss/memory'
import { createbook } from 'zss/memory/book'

import { ARG_TYPE, readargs } from './wordtypes'

const ismac = navigator.userAgent.indexOf('Mac') !== -1
const metakey = ismac ? 'cmd' : 'ctrl'

const COLOR_EDGE = '$dkpurple'

const CHR_TM = '$196'
const CHR_BM = '$205'

function fg(color: string, text: string) {
  return `$${color}${text}$blue`
}

function bg(color: string, text: string) {
  return `$${color}${text}$ondkblue`
}

function write(text: string) {
  tape_info('cli', text)
}

function writeheader(header: string) {
  const CHR_TBAR = CHR_TM.repeat(header.length + 2)
  const CHR_BBAR = CHR_BM.repeat(header.length + 2)
  write(`${COLOR_EDGE} ${' '.repeat(header.length)} `)
  write(`${COLOR_EDGE}${CHR_TBAR}`)
  write(`${COLOR_EDGE} $white${header} `)
  write(`${COLOR_EDGE}${CHR_BBAR}`)
}

function writesection(section: string) {
  const CHR_BBAR = CHR_BM.repeat(section.length + 2)
  write(`${COLOR_EDGE} ${' '.repeat(section.length)} `)
  write(`${COLOR_EDGE} $gray${section} `)
  write(`${COLOR_EDGE}${CHR_BBAR}`)
}

function writeoption(option: string, label: string) {
  write(`${COLOR_EDGE} $white${option} $blue${label}`)
}

function writetext(text: string) {
  write(`${COLOR_EDGE} $blue${text}`)
}

// player cli state here ...
type CLI_MEMORY_FLAGS = Record<string, Record<string, any>>

const CLI_MEMORY = proxy({
  openbook: '',
  flags: {} as CLI_MEMORY_FLAGS,
})

function readflags(player: string) {
  CLI_MEMORY.flags[player] = CLI_MEMORY.flags[player] ?? {}
  return CLI_MEMORY.flags[player]
}

function readflag(player: string, name: string) {
  const flags = readflags(player)
  return flags?.[name]
}

function setflag(player: string, name: string, value: any) {
  const flags = readflags(player)
  flags[name] = value
  return value
}

export const CLI_FIRMWARE = createfirmware({
  get(chip, name) {
    const memory = memoryreadchip(chip.id())
    const flag = readflag(memory.player, name)
    return [ispresent(flag), flag]
  },
  set(chip, name, value) {
    const memory = memoryreadchip(chip.id())
    const flag = setflag(memory.player, name, value)
    return [ispresent(flag), flag]
  },
  shouldtick() {},
  tick() {},
  tock() {},
})
  .command('text', (_chip, words) => {
    const text = words.map(maptostring).join(' ')
    tape_info('cli', '$2:', text)
    return 0
  })
  .command('hyperlink', (_chip, args) => {
    // package into a panel item
    const [labelword, ...words] = args
    const label = maptostring(labelword)
    const hyperlink = words.map(maptostring).join(' ')
    tape_info('$2', `!${hyperlink};${label}`)
    return 0
  })
  .command('help', () => {
    writeheader(`H E L P`)
    writeoption(`#1`, `zss controls and inputs`)
    writeoption(`#2`, `text formatting`)
    writeoption(`#3`, `edit commands`)
    writeoption(`#4`, `player settings`)
    writesection(`keyboard input`)
    writeoption(`?`, `open console`)
    writeoption(`esc`, `close console`)
    writeoption(`tab`, `move console`)
    writeoption(`up / down arrow keys`, `navigate console items`)
    writeoption(`left / right arrow keys`, `change console items`)
    writeoption(`enter`, `interact with console items`)
    writeoption(`alt + arrow keys`, `skip words and console lines`)
    writeoption(`${metakey} + up / down arrow keys`, `input history`)
    return 0
  })
  .command('1', () => {
    writeheader(`zss controls and inputs`)
    writesection(`keyboard input`)
    writeoption(`arrow keys`, `move`)
    writeoption(`shift + arrow keys`, `shoot`)
    writeoption(`enter`, `ok / accept`)
    writeoption(`escape`, `cancel / close`)
    writeoption(`tab`, `menu / action`)
    writesection(`mouse input`)
    writetext(`todo ???`)
    writesection(`controller input`)
    writeoption(`left stick`, `move`)
    writeoption(`right stick`, `aim`)
    writeoption(`a`, `ok / accept`)
    writeoption(`b`, `cancel / close`)
    writeoption(`y`, `menu / action`)
    writeoption(`x`, `shoot`)
    writeoption(`triggers`, `shoot`)
    return 0
  })
  .command('2', () => {
    writeheader(`text formatting`)
    writesection(`typography`)
    writetext(`plain text`)
    writetext(`$centering text`)
    writetext(`"\\"@quoted strings for special chars\\""`)
    writetext(`$$0-255 for ascii chars $159$176$240`)
    writetext(
      `use color names like ${fg('red', '$$red')} to change foreground color`,
    )
    writetext(
      `use color names like ${bg('ongreen', '$$ongreen')} to change background color`,
    )
    writetext(`use clear ${bg('clear', 'to change background to')} transparent`)
    writesection(`hyperlinks`)
    writetext(
      `${fg('white', '"!hotkey"')} message shortcut;${fg('gray', 'Label')}`,
    )
    writetext(
      `${fg('white', '"!range"')} flag [labelmin] [labelmax];${fg('gray', 'Input Label')}`,
    )
    writetext(
      `${fg('white', '"!select"')} flag ...list of values;${fg('gray', 'Input Label')}`,
    )
    writetext(
      `${fg('white', '"!number"')} flag [minvalue] [maxvalue];${fg('gray', 'Input Label')}`,
    )
    writetext(`${fg('white', '"!text"')} flag;${fg('gray', 'Input Label')}`)
    return 0
  })
  .command('3', () => {
    writeheader(`edit commands`)
    writeoption(`#books`, `list books in memory`)
    writeoption(`#pages`, `list pages in opened book`)
    writeoption(
      `@[pagetype:]page name`,
      `create & edit a new codepage in the currently opened book`,
    )
    return 0
  })
  .command('4', () => {
    writeheader(`player settings`)
    writetext(`todo`)
    return 0
  })
  .command('books', () => {
    writesection(`books`)
    const list = memoryreadbooklist()
    if (list.length) {
      list.forEach((book) => {
        write(`!bookopen ${book.id};${book.name}`)
      })
    } else {
      writetext(`no books found`)
    }
    write(`!bookcreate;create a new book`)
    return 0
  })
  .command('stat', (chip, words) => {
    // const memory = memoryreadchip(chip.id())
    // all this command does for now is update name
    // if (memory.object) {
    //   memory.object.name = words.map(maptostring).join(' ')
    // }
    // tape_info('cli', 'STAT INVOKE', ...words)
    console.info('????', words)
    return 0
  })
  .command('send', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const read = memoryreadcontext(chip, words)
    const [msg, data] = readargs(read, 0, [ARG_TYPE.STRING, ARG_TYPE.ANY])
    console.info(msg, data, words)

    switch (msg) {
      case 'bookcreate': {
        const book = createbook(createname(), [])
        memorysetbook(book)
        writetext(`created ${book.name}`)
        write(`!bookopen ${book.id};open ${book.name}`)
        break
      }
      case 'bookopen':
        if (isstring(data)) {
          const book = memoryreadbook(data)
          if (ispresent(book)) {
            CLI_MEMORY.openbook = data
            writetext(`opened book ${book.name}`)
          } else {
            api_error(
              'cli',
              'bookopen',
              `book with id ${data} not found`,
              memory.player,
            )
          }
        } else {
          api_error(
            'cli',
            'bookopen',
            `expected book id, got: ${data} instead`,
            memory.player,
          )
        }
        // write(`open book ${data}`)
        break
      case 'bookclose':
        break
      default:
        tape_info('cli', msg, data)
        break
    }

    return 0
  })
