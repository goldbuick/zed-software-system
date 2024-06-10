import { maptostring } from 'zss/chip'
import { api_error, tape_editor_open, tape_info } from 'zss/device/api'
import { modemwritestring } from 'zss/device/modem'
import { createfirmware } from 'zss/firmware'
import { ispresent, isstring } from 'zss/mapping/types'
import {
  memoryreadbook,
  memoryreadbooklist,
  memoryreadchip,
  memoryreadcontext,
  memorysetbook,
} from 'zss/memory'
import {
  bookreadcodepage,
  bookreadflag,
  booksetflag,
  bookwritecodepage,
  createbook,
} from 'zss/memory/book'
import {
  codepagereadname,
  codepagereadtype,
  codepagereadtypetostring,
  createcodepage,
} from 'zss/memory/codepage'

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

// cli's only state ?
let openbook = ''

export const CLI_FIRMWARE = createfirmware({
  get(chip, name) {
    // check player's flags
    const memory = memoryreadchip(chip.id())
    // then global
    const value = bookreadflag(memory.book, memory.player, name)
    return [ispresent(value), value]
  },
  set(chip, name, value) {
    const memory = memoryreadchip(chip.id())
    // set player's flags
    booksetflag(memory.book, memory.player, name, value)
    return [true, value]
  },
  shouldtick() {},
  tick() {},
  tock() {},
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
  .command('text', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const text = words.map(maptostring).join(' ')
    tape_info('$2', `${memory.player}: ${text}`)
    return 0
  })
  .command('hyperlink', (chip, args) => {
    const memory = memoryreadchip(chip.id())
    const [labelword, ...words] = args
    const label = maptostring(labelword)
    const hyperlink = words.map(maptostring).join(' ')
    tape_info('$2', `!${hyperlink};${memory.player}: ${label}`)
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
  .command('pages', (chip) => {
    writesection(`pages`)
    const book = memoryreadbook(openbook)
    if (ispresent(book)) {
      if (book.pages.length) {
        book.pages.forEach((page) => {
          const name = codepagereadname(page)
          write(`!pageopen ${page.id};${name}`)
        })
      } else {
        writetext(`no pages found`)
        writetext(`use @ to create a page`)
        writetext(`@board Name of board`)
        writetext(`@terrain Name of terrain`)
        writetext(`@charset Name of charset`)
        writetext(`@palette Name of palette`)
        writetext(`You can omit the type and it will default to object`)
        writetext(`@object Name of object`)
        writetext(`@Name of object`)
      }
    } else {
      writetext(`no book currently open`)
      chip.command('books')
    }
    return 0
  })
  .command('stat', (chip, words) => {
    let book = memoryreadbook(openbook)

    // create book if needed
    if (!ispresent(book)) {
      book = createbook([])
      openbook = book.id
      memorysetbook(book)
      writetext(`created and opened ${book.name}`)
      if (!ispresent(book)) {
        // bail ??
        return 0
      }
    }

    // create page
    const [codepage] = words
    const memory = memoryreadchip(chip.id())
    const code = `@${codepage}\n`

    // add to book if needed, use page from book if name matches
    let page = createcodepage(code, {})
    const name = codepagereadname(page)
    const type = codepagereadtypetostring(page)
    const maybepage = bookreadcodepage(book, codepagereadtype(page), name)

    if (ispresent(maybepage)) {
      page = maybepage
      writetext(`opened ${name} of type ${type}`)
    } else {
      bookwritecodepage(book, page)
      writetext(`created ${name} of type ${type}`)
    }

    // write to modem so ui can pick it up
    modemwritestring(page.id, code)

    // tell tape to open a code editor for given page
    tape_editor_open(
      'cli',
      openbook,
      page.id,
      codepagereadtypetostring(page),
      `${book.name}:${name}`,
      memory.player,
    )
    return 0
  })
  .command('send', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const read = memoryreadcontext(chip, words)
    const [msg, data] = readargs(read, 0, [ARG_TYPE.STRING, ARG_TYPE.ANY])

    switch (msg) {
      case 'bookcreate': {
        const book = createbook([])
        openbook = book.id
        memorysetbook(book)
        writetext(`created and opened ${book.name}`)
        break
      }
      case 'bookopen':
        if (isstring(data)) {
          const book = memoryreadbook(data)
          if (ispresent(book)) {
            openbook = data
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
        break
      default:
        tape_info('$2', `${msg} ${data ?? ''}`)
        break
    }

    return 0
  })
