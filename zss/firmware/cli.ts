import { maptostring } from 'zss/chip'
import {
  api_error,
  register_biostrash,
  register_biosflash,
  tape_editor_open,
  tape_info,
  vm_codeaddress,
  vm_flush,
  register_nodetrash,
} from 'zss/device/api'
import { modemwriteinitstring } from 'zss/device/modem'
import { createfirmware } from 'zss/firmware'
import { ispresent, isstring } from 'zss/mapping/types'
import {
  memoryclearbook,
  memoryensuresoftwarebook,
  memoryreadbookbyaddress,
  memoryreadbookbysoftware,
  memoryreadbooklist,
  memoryreadchip,
  memoryreadcontext,
  memorysetsoftwarebook,
} from 'zss/memory'
import {
  bookclearcodepage,
  bookreadcodepagebyaddress,
  bookreadflag,
  booksetflag,
} from 'zss/memory/book'
import { codepagereadname, codepagereadtypetostring } from 'zss/memory/codepage'

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

function writetbar(width: number) {
  const CHR_TBAR = CHR_TM.repeat(width)
  write(`${COLOR_EDGE}${CHR_TBAR}`)
}

function writebbar(width: number) {
  const CHR_BBAR = CHR_BM.repeat(width)
  write(`${COLOR_EDGE}${CHR_BBAR}`)
}

function writeheader(header: string) {
  // const CHR_TBAR = CHR_TM.repeat(header.length + 2)
  // const CHR_BBAR = CHR_BM.repeat(header.length + 2)
  write(`${COLOR_EDGE} ${' '.repeat(header.length)} `)
  writetbar(header.length + 2)
  // write(`${COLOR_EDGE}${CHR_TBAR}`)
  write(`${COLOR_EDGE} $white${header} `)
  writebbar(header.length + 2)
  // write(`${COLOR_EDGE}${CHR_BBAR}`)
}

function writesection(section: string) {
  // const CHR_BBAR = CHR_BM.repeat(section.length + 2)
  write(`${COLOR_EDGE} ${' '.repeat(section.length)} `)
  write(`${COLOR_EDGE} $gray${section} `)
  writebbar(section.length + 2)
  // write(`${COLOR_EDGE}${CHR_BBAR}`)
}

function writeoption(option: string, label: string) {
  write(`${COLOR_EDGE} $white${option} $blue${label}`)
}

function writetext(text: string) {
  write(`${COLOR_EDGE}$blue${text}`)
}

function ensureopenbookinmain() {
  return memoryensuresoftwarebook('main')
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
  .command('stat', (chip, words) => {
    const [maybeargs] = words
    if (!isstring(maybeargs)) {
      return 0
    }
    const [maybetype, maybename] = maybeargs.split(' ')
    const type = ispresent(maybename) ? maptostring(maybetype) : 'object'
    const name = ispresent(maybename)
      ? maptostring(maybename)
      : maptostring(maybetype)
    // create
    chip.command('mod', type, name)
    chip.command('pageopen', name)
    return 0
  })
  .command('text', (_, words) => {
    const text = words.map(maptostring).join(' ')
    tape_info('$2', text)
    return 0
  })
  .command('hyperlink', (_, args) => {
    // const memory = memoryreadchip(chip.id())
    const [labelword, ...words] = args
    const label = maptostring(labelword)
    const hyperlink = words.map(maptostring).join(' ')
    tape_info('$2', `!${hyperlink};${label}`)
    return 0
  })
  .command('bookcreate', (chip, words) => {
    const [name] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.STRING,
    ])

    const book = memoryensuresoftwarebook('main', name)
    if (ispresent(book)) {
      chip.command('bookopen', book.id)
    }
    return 0
  })
  .command('bookopen', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [name] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.STRING,
    ])

    const book = memoryreadbookbyaddress(name)
    if (ispresent(book)) {
      writetext(`opened [book] ${book.name}`)
      memorysetsoftwarebook('main', book.id)
      chip.command('pages')
    } else {
      api_error('cli', 'bookopen', `book ${name} not found`, memory.player)
    }
    return 0
  })
  .command('booktrash', (chip, words) => {
    const [address] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.STRING,
    ])

    const opened = memoryreadbookbysoftware('main')
    const book = memoryreadbookbyaddress(address)
    if (ispresent(book)) {
      // clear opened
      if (opened === book) {
        memorysetsoftwarebook('main', '')
      }
      // clear book
      memoryclearbook(address)
      writetext(`trashed [book] ${book.name}`)
      vm_flush('cli')
      // reset to good state
      chip.command('pages')
    }
    return 0
  })
  .command('pageopen', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [page] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.STRING,
    ])

    // create book if needed
    const book = ensureopenbookinmain()
    if (!ispresent(book)) {
      return 0
    }

    const codepage = bookreadcodepagebyaddress(book, page)
    if (ispresent(codepage)) {
      const name = codepagereadname(codepage)
      const pagetype = codepagereadtypetostring(codepage)
      writetext(`opened [${pagetype}] ${name}`)

      // write to modem
      modemwriteinitstring(vm_codeaddress(book.id, codepage.id), codepage.code)

      // tell tape to open a code editor for given page
      const type = codepagereadtypetostring(codepage)
      tape_editor_open(
        'cli',
        book.id,
        codepage.id,
        type,
        `@book ${book.name}:${name}`,
        memory.player,
      )
    } else {
      api_error('cli', 'pageopen', `page ${page} not found`, memory.player)
    }
    return 0
  })
  .command('pagetrash', (chip, words) => {
    const [page] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.STRING,
    ])

    const book = ensureopenbookinmain()
    const codepage = bookclearcodepage(book, page)
    if (ispresent(page)) {
      const name = codepagereadname(codepage)
      const pagetype = codepagereadtypetostring(codepage)
      writetext(`trashed [${pagetype}] ${name}`)
      vm_flush('cli')
      chip.command('pages')
    }

    return 0
  })
  .command('nodetrash', () => {
    register_nodetrash('cli')
    writetext(`node id changed, refreshing page recommended`)
    return 0
  })
  .command('biosflash', () => {
    register_biosflash('cli')
    writetext(`bios flashed`)
    return 0
  })
  .command('biostrash', () => {
    register_biostrash('cli')
    writetext(`bios erased, refreshing page recommended`)
    return 0
  })
  .command('help', (chip, words) => {
    const text = words.map(maptostring).join(' ') || 'menu'
    chip.command(`help${text}`)
    return 0
  })
  .command('books', () => {
    writesection(`books`)
    const main = memoryreadbookbysoftware('main')
    writeoption('main', `${main?.name ?? 'empty'} $GREEN${main?.id ?? ''}`)
    const content = memoryreadbookbysoftware('content')
    writeoption('content', `${content?.name ?? 'empty'} ${content?.id ?? ''}`)
    writebbar(7)
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
    const book = ensureopenbookinmain()
    if (ispresent(book)) {
      writeoption('main', `${book.name} $GREEN${book.id}`)
      if (book.pages.length) {
        book.pages.forEach((page) => {
          const name = codepagereadname(page)
          write(`!pageopen ${page.id};${name}`)
        })
      } else {
        write(``)
        writetext(`no pages found`)
        writetext(`use @ to create a page`)
        writetext(`@board name of board`)
        writetext(`@object name of object`)
        writetext(`@terrain name of terrain`)
        writetext(`You can omit the type and it will default to object`)
        writetext(`@object name of object`)
        writetext(`@name of object`)
      }
    } else {
      chip.command('bookopen', 'main')
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
    const book = memoryreadbookbysoftware('main')
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
    const [msg, data] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.STRING,
      ARG_TYPE.ANY,
    ])

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
        // writeoption(`#update`, `write current books to bios`)
        // writeoption(`#factoryreset`, `erase books stored in bios`)
        break
      case 'helpplayer':
        writeheader(`player settings`)
        writetext(`todo`)
        break
      default:
        tape_info('$2', `${msg} ${data ?? ''}`)
        break
    }

    return 0
  })
