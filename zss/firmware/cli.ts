import { maptostring } from 'zss/chip'
import {
  api_error,
  register_bioserase,
  register_biosflash,
  tape_editor_open,
  tape_info,
  vm_codeaddress,
  vm_flush,
} from 'zss/device/api'
import { modemwriteinitstring } from 'zss/device/modem'
import { createfirmware } from 'zss/firmware'
import { ispresent, isstring } from 'zss/mapping/types'
import {
  PLAYER_BOOK,
  memoryclearbook,
  memoryreadbook,
  memoryreadbooklist,
  memoryreadchip,
  memoryreadcontext,
  memorysetbook,
} from 'zss/memory'
import {
  bookclearcodepage,
  bookfindcodepage,
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
  write(`${COLOR_EDGE}$blue${text}`)
}

// cli's only state ?
let openbook = ''

function createnewbook(maybename?: any) {
  const book = createbook([])

  if (isstring(maybename)) {
    book.name = maybename
  } else if (!ispresent(memoryreadbook(PLAYER_BOOK))) {
    // auto-fill @book main
    book.name = PLAYER_BOOK
  }

  memorysetbook(book)

  // message
  writetext(`created ${book.name}`)
  cli_flush() // tell register to save changes

  return book
}

function ensureopenbook() {
  let book = memoryreadbook(openbook)

  // book already open
  if (ispresent(book)) {
    return book
  }

  // attempt to open main
  book = memoryreadbook(PLAYER_BOOK)
  if (ispresent(book)) {
    openbook = book.id
    writetext(`opened [book] ${book.name}`)
    return book
  }

  // create book
  return createnewbook()
}

function cli_flush() {
  vm_flush('cli')
}

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
  .command('help', (chip, words) => {
    const text = words.map(maptostring).join(' ') || 'menu'
    chip.command(`help${text}`)
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
      chip.command('bookopen', 'main')
    }
    return 0
  })
  .command('stat', (chip, words) => {
    // create page
    const [maybecodepage] = words
    const codepage = maptostring(maybecodepage)

    // check for special @book [name] case
    if (/^book /gi.test(codepage)) {
      const name = codepage.substring(5)
      chip.command('bookopenorcreate', name)
    } else {
      chip.command('pageopenorcreate', codepage)
    }

    return 0
  })
  .command('trash', () => {
    writesection(`$REDTRASH`)
    writetext(`books`)
    const list = memoryreadbooklist()
    if (list.length) {
      list.forEach((book) => {
        write(`!booktrash ${book.id};$REDTRASH ${book.name}`)
      })
      write('')
    }
    const book = memoryreadbook(openbook)
    if (ispresent(book)) {
      writetext(`pages in open ${book.name} book`)
      book.pages.forEach((page) => {
        const name = codepagereadname(page)
        write(`!pagetrash ${page.id};$REDTRASH ${name}`)
      })
      write('')
    }
    return 0
  })
  .command('save', () => {
    vm_flush('cli')
    return 0
  })
  .command('update', () => {
    const booknames = memoryreadbooklist()
      .map((item) => item.name)
      .join(' ')
    write(`!biosflash;$GREENWrite ${booknames} to bios`)
    return 0
  })
  .command('factoryreset', () => {
    // todo, list book names in bios
    write(`!bioserase;$REDReset bios`)
    return 0
  })
  .command('send', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const read = memoryreadcontext(chip, words)
    const [msg, data] = readargs(read, 0, [ARG_TYPE.STRING, ARG_TYPE.ANY])

    switch (msg) {
      // help messages
      case 'helpmenu':
        writeheader(`H E L P`)
        writeoption(`#help controls`, `zss controls and inputs`)
        write(`!helpcontrols;read help controls`)
        write(``)
        writeoption(`#help text`, `text formatting`)
        write(`!helptext;read help text`)
        write(``)
        writeoption(`#help developer`, `developer commands`)
        write(`!helpdeveloper;read help developer`)
        write(``)
        writeoption(`#help player`, `player settings`)
        write(`!helpplayer;read help player`)
        write(``)
        writesection(`keyboard input`)
        writeoption(`?`, `open console`)
        writeoption(`esc`, `close console`)
        writeoption(`tab`, `move console`)
        writeoption(`up / down arrow keys`, `navigate console items`)
        writeoption(`left / right arrow keys`, `change console items`)
        writeoption(`enter`, `interact with console items`)
        writeoption(`alt + arrow keys`, `skip words and console lines`)
        writeoption(`${metakey} + up / down arrow keys`, `input history`)
        break
      case 'helpcontrols':
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
        break
      case 'helptext':
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
        writetext(
          `use clear ${bg('clear', 'to change background to')} transparent`,
        )
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
        break
      case 'helpdeveloper':
        writeheader(`developer commands`)
        writeoption(`#books`, `list books in memory`)
        writeoption(`#pages`, `list pages in opened book`)
        writeoption(
          `@[pagetype:]page name`,
          `create & edit a new codepage in the currently opened book`,
        )
        writeoption(
          `#trash`,
          `list books and pages from open book you can delete`,
        )
        writeoption(`#save`, `flush state to register`)
        writeoption(`#update`, `write current books to bios`)
        writeoption(`#factoryreset`, `erase books stored in bios`)
        break
      case 'helpplayer':
        writeheader(`player settings`)
        writetext(`todo`)
        break
      // developer edits
      case 'bookcreate': {
        const book = createnewbook(data)
        chip.command('bookopen', book.id)
        break
      }
      case 'bookopen':
        if (isstring(data)) {
          const book = memoryreadbook(data)
          if (ispresent(book)) {
            openbook = data
            writetext(`opened [book] ${book.name}`)
            chip.command('pages')
          } else {
            api_error(
              'cli',
              'bookopen',
              `book ${data} not found`,
              memory.player,
            )
          }
        } else {
          api_error(
            'cli',
            'bookopen',
            `expected book id or name, got: ${data} instead`,
            memory.player,
          )
        }
        break
      case 'bookopenorcreate': {
        const book = memoryreadbook(data)
        if (ispresent(book)) {
          chip.command('bookopen', data)
        } else {
          chip.command('bookcreate', data)
        }
        break
      }
      case 'booktrash':
        if (isstring(data)) {
          const opened = memoryreadbook(openbook)
          const book = memoryreadbook(data)
          if (ispresent(book)) {
            // clear opened
            if (opened === book) {
              openbook = ''
            }
            // clear book
            memoryclearbook(data)
            writetext(`trashed [book] ${book.name}`)
            cli_flush() // tell register to save changes
            chip.command('pages')
          }
        }
        break
      case 'pagecreate':
        if (isstring(data)) {
          // create book if needed
          const book = ensureopenbook()
          if (!ispresent(book)) {
            return 0
          }

          // add to book if needed, use page from book if name matches
          const code = `@${data}\n`
          const page = createcodepage(code, {})
          const name = codepagereadname(page)

          // only create if target doesn't already exist
          const maybepage = bookreadcodepage(book, codepagereadtype(page), name)
          if (!ispresent(maybepage)) {
            bookwritecodepage(book, page)
            const pagetype = codepagereadtypetostring(page)
            writetext(`create [${pagetype}] ${name}`)
            cli_flush() // tell register to save changes
            chip.command('pageopen', page.id) // open created content
          }
        }
        break
      case 'pageopen':
        if (isstring(data)) {
          // create book if needed
          const book = ensureopenbook()
          if (!ispresent(book)) {
            return 0
          }

          // store success !
          openbook = book.id
          const page = bookfindcodepage(book, data)
          if (ispresent(page)) {
            const name = codepagereadname(page)
            const pagetype = codepagereadtypetostring(page)
            writetext(`opened [${pagetype}] ${name}`)

            // write to modem
            modemwriteinitstring(vm_codeaddress(book.id, page.id), page.code)

            // tell tape to open a code editor for given page
            const type = codepagereadtypetostring(page)
            tape_editor_open(
              'cli',
              openbook,
              page.id,
              type,
              `@book ${book.name}:${name}`,
              memory.player,
            )
          } else {
            api_error('cli', msg, `page ${data} not found`, memory.player)
          }
        }
        break
      case 'pageopenorcreate':
        if (isstring(data)) {
          // create book if needed
          const book = ensureopenbook()
          if (!ispresent(book)) {
            return 0
          }
          // find page, and create if not found
          const page = bookfindcodepage(book, data)
          if (ispresent(page)) {
            chip.command('pageopen', data)
          } else {
            chip.command('pagecreate', data)
          }
        }
        break
      case 'pagetrash':
        if (isstring(data)) {
          const book = ensureopenbook()
          const page = bookclearcodepage(book, data)
          if (ispresent(page)) {
            const name = codepagereadname(page)
            const pagetype = codepagereadtypetostring(page)
            writetext(`trashed [${pagetype}] ${name}`)
            cli_flush() // tell register to save changes
            chip.command('pages')
          }
        }
        break
      case 'biosflash':
        register_biosflash('cli')
        writetext(`bios flashed`)
        break
      case 'bioserase':
        register_bioserase('cli')
        writetext(`bios erased, refreshing page recommended`)
        break
      default:
        tape_info('$2', `${msg} ${data ?? ''}`)
        break
    }

    return 0
  })
