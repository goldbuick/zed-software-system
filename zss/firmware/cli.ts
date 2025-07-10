import { parsetarget } from 'zss/device'
import {
  api_error,
  register_editor_open,
  vm_codeaddress,
  vm_flush,
  register_nuke,
  register_share,
  register_dev,
  bridge_start,
  register_inspector,
  vm_restart,
  vm_fork,
  register_downloadjsonfile,
  bridge_tab,
  api_log,
  register_config,
  register_configshow,
  vm_loader,
  register_enterar,
  vm_itchiopublish,
} from 'zss/device/api'
import { modemwriteinitstring } from 'zss/device/modem'
import { SOFTWARE } from 'zss/device/session'
import {
  write,
  writebbar,
  writeheader,
  writeoption,
  writesection,
  writetext,
} from 'zss/feature/writeui'
import { createfirmware } from 'zss/firmware'
import { pick } from 'zss/mapping/array'
import { randominteger } from 'zss/mapping/number'
import { deepcopy, ispresent, isstring, MAYBE } from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import {
  MEMORY_LABEL,
  memoryboardread,
  memoryclearbook,
  memorycreatesoftwarebook,
  memoryensuresoftwarebook,
  memoryensuresoftwarecodepage,
  memoryreadbookbyaddress,
  memoryreadbookbysoftware,
  memoryreadbooklist,
  memoryreadflags,
  memoryreadoperator,
  memorysendtoboards,
  memorysetsoftwarebook,
} from 'zss/memory'
import {
  bookclearcodepage,
  bookelementdisplayread,
  bookreadcodepagebyaddress,
  bookreadsortedcodepages,
} from 'zss/memory/book'
import {
  bookplayermovetoboard,
  bookplayerreadboards,
} from 'zss/memory/bookplayer'
import {
  codepagereadname,
  codepagereadtype,
  codepagereadtypetostring,
} from 'zss/memory/codepage'
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BOOK,
  CODE_PAGE,
  CODE_PAGE_TYPE,
} from 'zss/memory/types'
import { romparse, romprint, romread } from 'zss/rom'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'
import { parsesend, SEND_META } from 'zss/words/send'
import { stattypestring } from 'zss/words/stats'
import { COLOR, NAME, STAT_TYPE } from 'zss/words/types'

function vm_flush_op() {
  vm_flush(SOFTWARE, memoryreadoperator())
}

function helpprint(address: string) {
  romparse(romread(`help:${address}`), (line) =>
    romprint(READ_CONTEXT.elementfocus, line),
  )
}

function handlesend(send: SEND_META) {
  switch (send.label) {
    // help messages
    case 'helpmenu':
      helpprint('menu')
      break
    case 'helpcontrols':
      helpprint('controls')
      break
    case 'helptext':
      helpprint('text')
      break
    case 'helpdeveloper':
      helpprint('developer')
      break
    case 'helpplayer':
      helpprint('player')
      break
    default: {
      const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
      const boards = bookplayerreadboards(mainbook)
      if (ispresent(send.targetname)) {
        memorysendtoboards(send.targetname, send.label, undefined, boards)
      } else if (ispresent(send.targetdir)) {
        memorysendtoboards(send.targetdir.destpt, send.label, undefined, boards)
      }
      break
    }
  }
}

export const CLI_FIRMWARE = createfirmware()
  .command('shortsend', (_, words) => {
    const send = parsesend(words)
    handlesend(send)
    return 0
  })
  .command('send', (_, words) => {
    const send = parsesend(['send', ...words])
    handlesend(send)
    return 0
  })
  .command('stat', (chip, words) => {
    const [maybetype, ...args] = words.map(maptostring)
    const maybename = args.join(' ')

    function openeditor(codepage: MAYBE<CODE_PAGE>, didcreate: boolean) {
      if (ispresent(codepage)) {
        chip.command('pageopen', codepage.id)
        if (didcreate) {
          const name = codepagereadname(codepage)
          const type = codepagereadtypetostring(codepage)
          write(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            `!pageopen ${codepage.id};$blue[${type}]$white ${name}`,
          )
        }
      }
    }

    // attempt to check first word as codepage type to create
    switch (NAME(maybetype)) {
      case stattypestring(STAT_TYPE.LOADER): {
        const [codepage, didcreate] = memoryensuresoftwarecodepage(
          MEMORY_LABEL.MAIN,
          maybename,
          CODE_PAGE_TYPE.LOADER,
        )
        openeditor(codepage, didcreate)
        break
      }
      default: {
        const [codepage, didcreate] = memoryensuresoftwarecodepage(
          MEMORY_LABEL.MAIN,
          [maybetype, ...args].join(' '),
          CODE_PAGE_TYPE.OBJECT,
        )
        openeditor(codepage, didcreate)
        break
      }
      case stattypestring(STAT_TYPE.BOARD): {
        const [codepage, didcreate] = memoryensuresoftwarecodepage(
          MEMORY_LABEL.MAIN,
          maybename,
          CODE_PAGE_TYPE.BOARD,
        )
        openeditor(codepage, didcreate)
        break
      }
      case stattypestring(STAT_TYPE.OBJECT): {
        const [codepage, didcreate] = memoryensuresoftwarecodepage(
          MEMORY_LABEL.MAIN,
          maybename,
          CODE_PAGE_TYPE.OBJECT,
        )
        openeditor(codepage, didcreate)
        break
      }
      case stattypestring(STAT_TYPE.TERRAIN): {
        const [codepage, didcreate] = memoryensuresoftwarecodepage(
          MEMORY_LABEL.MAIN,
          maybename,
          CODE_PAGE_TYPE.TERRAIN,
        )
        openeditor(codepage, didcreate)
        break
      }
      case stattypestring(STAT_TYPE.CHARSET): {
        const [codepage, didcreate] = memoryensuresoftwarecodepage(
          MEMORY_LABEL.MAIN,
          maybename,
          CODE_PAGE_TYPE.CHARSET,
        )
        openeditor(codepage, didcreate)
        break
      }
      case stattypestring(STAT_TYPE.PALETTE): {
        const [codepage, didcreate] = memoryensuresoftwarecodepage(
          MEMORY_LABEL.MAIN,
          maybename,
          CODE_PAGE_TYPE.PALETTE,
        )
        openeditor(codepage, didcreate)
        break
      }
    }
    return 0
  })
  .command('text', (_, words) => {
    const text = words.map(maptostring).join(' ')
    if (ispresent(READ_CONTEXT.element) && READ_CONTEXT.elementisplayer) {
      const { user } = memoryreadflags(READ_CONTEXT.elementid)
      const withuser = isstring(user) ? user : 'player'
      // $WOBBLE $BOUNCE $SPIN
      READ_CONTEXT.element.tickertext = `${withuser}: ${text}`
      READ_CONTEXT.element.tickertime = READ_CONTEXT.timestamp
      // log text
      const icon = bookelementdisplayread(READ_CONTEXT.element)
      api_log(
        SOFTWARE,
        READ_CONTEXT.elementid,
        `$${COLOR[icon.color]}$ON${COLOR[icon.bg]}$${icon.char}$ONCLEAR $WHITE${withuser}$BLUE ${text}`,
      )
      // raise event
      vm_loader(
        SOFTWARE,
        READ_CONTEXT.elementid,
        undefined,
        'text',
        `chat:message:game`,
        `${withuser}:${text}`,
      )
    }
    return 0
  })
  .command('hyperlink', (_, args) => {
    const [linkword, ...words] = args
    const linktext = maptostring(linkword)
    const send = parsesend(words)
    if (ispresent(send.targetname)) {
      const { user } = memoryreadflags(READ_CONTEXT.elementid)
      const withuser = isstring(user) ? user : 'player'
      const icon = bookelementdisplayread(READ_CONTEXT.element)
      const line = `$${COLOR[icon.color]}$ON${COLOR[icon.bg]}$${icon.char}$ONCLEAR $WHITE${withuser}$BLUE ${linktext}`
      api_log(
        SOFTWARE,
        READ_CONTEXT.elementid,
        `!${send.targetname}:${send.label};${line}`,
      )
    }
    return 0
  })
  // ---
  .command('config', (_, words) => {
    const [name, value] = readargs(words, 0, [
      ARG_TYPE.MAYBE_NAME,
      ARG_TYPE.MAYBE_STRING,
    ])
    if (isstring(name) && isstring(value)) {
      register_config(SOFTWARE, READ_CONTEXT.elementfocus, name, value)
    } else {
      register_configshow(SOFTWARE, READ_CONTEXT.elementfocus)
    }
    return 0
  })
  .command('bookcreate', (chip, words) => {
    const [maybename] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])

    const book = memorycreatesoftwarebook(maybename)
    if (ispresent(book)) {
      chip.command('bookopen', book.id)
    }
    return 0
  })
  .command('bookopen', (_, words) => {
    const [name] = readargs(words, 0, [ARG_TYPE.NAME])

    const book = memoryreadbookbyaddress(name)
    if (ispresent(book)) {
      register_config(SOFTWARE, READ_CONTEXT.elementfocus, 'selected', book.id)
      vm_flush_op()
    } else {
      api_error(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        'bookopen',
        `book ${name} not found`,
      )
    }

    return 0
  })
  .command('booktrash', (chip, words) => {
    const [address] = readargs(words, 0, [ARG_TYPE.NAME])

    const opened = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    const book = memoryreadbookbyaddress(address)
    if (ispresent(book)) {
      // clear opened
      if (opened === book) {
        memorysetsoftwarebook(MEMORY_LABEL.MAIN, '')
      }
      // clear book
      memoryclearbook(address)
      api_log(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        `trashed [book] ${book.name}`,
      )
      vm_flush_op()
      // reset to good state
      chip.command('pages')
    }
    return 0
  })
  .command('boardopen', (_, words) => {
    const [stat] = readargs(words, 0, [ARG_TYPE.NAME])
    const target = memoryboardread(stat)
    if (ispresent(target)) {
      bookplayermovetoboard(
        READ_CONTEXT.book,
        READ_CONTEXT.elementfocus,
        target.id,
        {
          x: randominteger(0, BOARD_WIDTH - 1),
          y: randominteger(0, BOARD_HEIGHT - 1),
        },
        true,
      )
    }

    return 0
  })
  .command('pageopen', (_, words) => {
    const [page, maybeobject] = readargs(words, 0, [
      ARG_TYPE.NAME,
      ARG_TYPE.MAYBE_NAME,
    ])

    // search through all books
    let codepage: MAYBE<CODE_PAGE> = undefined
    let codepagebook: MAYBE<BOOK> = undefined
    const booklist = memoryreadbooklist()
    for (let i = 0; i < booklist.length; ++i) {
      codepagebook = booklist[i]
      codepage = bookreadcodepagebyaddress(codepagebook, page)
      if (ispresent(codepage)) {
        break
      }
    }

    if (ispresent(codepage) && ispresent(codepagebook)) {
      const name = codepagereadname(codepage)
      const pagetype = codepagereadtypetostring(codepage)
      api_log(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        `opened [${pagetype}] ${name}`,
      )

      // path
      const path = [codepage.id, maybeobject]

      // write to modem
      modemwriteinitstring(vm_codeaddress(codepagebook.id, path), codepage.code)

      // tell tape to open a code editor for given page
      const type = codepagereadtypetostring(codepage)
      register_editor_open(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        codepagebook.id,
        path,
        type,
        `${name} - ${codepagebook.name}`,
      )
    } else {
      api_error(
        SOFTWARE,
        'pageopen',
        `page ${page} not found`,
        READ_CONTEXT.elementfocus,
      )
    }

    return 0
  })
  .command('pagetrash', (chip, words) => {
    const [page] = readargs(words, 0, [ARG_TYPE.NAME])

    const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
    const codepage = bookclearcodepage(mainbook, page)
    if (ispresent(page)) {
      const name = codepagereadname(codepage)
      const pagetype = codepagereadtypetostring(codepage)
      api_log(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        `trashed [${pagetype}] ${name}`,
      )
      vm_flush_op()
      chip.command('pages')
    }

    return 0
  })
  .command('help', (chip, words) => {
    const text = words.map(maptostring).join(' ') || 'menu'
    chip.command(`help${text}`)
    return 0
  })
  .command('books', () => {
    writesection(SOFTWARE, READ_CONTEXT.elementfocus, `books`)
    const main = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    writeoption(
      SOFTWARE,
      READ_CONTEXT.elementfocus,
      'main',
      `${main?.name ?? 'empty'} $GREEN${main?.id ?? ''}`,
    )
    const content = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    writeoption(
      SOFTWARE,
      READ_CONTEXT.elementfocus,
      'content',
      `${content?.name ?? 'empty'} ${content?.id ?? ''}`,
    )
    writebbar(SOFTWARE, READ_CONTEXT.elementfocus, 7)
    const list = memoryreadbooklist()
    if (list.length) {
      list.forEach((book) => {
        write(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `!bookopen ${book.id};${book.name}`,
        )
      })
    } else {
      writetext(SOFTWARE, READ_CONTEXT.elementfocus, `no books found`)
    }
    write(SOFTWARE, READ_CONTEXT.elementfocus, `!bookcreate;create a new book`)
    return 0
  })
  .command('pages', () => {
    const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
    if (!ispresent(mainbook)) {
      return 0
    }
    writesection(SOFTWARE, READ_CONTEXT.elementfocus, `pages`)
    writeoption(
      SOFTWARE,
      READ_CONTEXT.elementfocus,
      'main',
      `${mainbook.name} $GREEN${mainbook.id}`,
    )
    if (mainbook.pages.length) {
      const sorted = bookreadsortedcodepages(mainbook)
      sorted.forEach((page) => {
        const name = codepagereadname(page)
        const type = codepagereadtypetostring(page)
        write(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `!pageopen ${page.id};$blue[${type}]$white ${name}`,
        )
      })
    } else {
      write(SOFTWARE, READ_CONTEXT.elementfocus, ``)
      writetext(SOFTWARE, READ_CONTEXT.elementfocus, `$white no pages found`)
      writetext(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        `$white use @ to create a page`,
      )
      writetext(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        `$white @board name of board`,
      )
      writetext(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        `$white @object name of object`,
      )
      writetext(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        `$white @terrain name of terrain`,
      )
      writetext(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        `$white You can omit the type and it will default to object`,
      )
      writetext(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        `$white @object name of object`,
      )
      writetext(SOFTWARE, READ_CONTEXT.elementfocus, `$white @name of object`)
    }

    const booklist = memoryreadbooklist()
    for (let i = 0; i < booklist.length; ++i) {
      const book = booklist[i]
      if (book.id !== mainbook.id) {
        writeoption(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          'content',
          `${book.name} $GREEN${book.id}`,
        )
        const sorted = bookreadsortedcodepages(book)
        sorted.forEach((page) => {
          const name = codepagereadname(page)
          const type = codepagereadtypetostring(page)
          write(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            `!pageopen ${page.id};$blue[${type}]$white ${name}`,
          )
        })
      }
    }

    return 0
  })
  .command('boards', () => {
    writesection(SOFTWARE, READ_CONTEXT.elementfocus, `boards`)
    const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
    if (ispresent(mainbook)) {
      writeoption(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        'main',
        `${mainbook.name} $GREEN${mainbook.id}`,
      )
      const sorted = bookreadsortedcodepages(mainbook)
      sorted
        .filter((page) => codepagereadtype(page) === CODE_PAGE_TYPE.BOARD)
        .forEach((page) => {
          const name = codepagereadname(page)
          write(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            `!boardopen ${page.id};$blue#goto $white $34 ${name} $34`,
          )
        })
      if (sorted.length === 0) {
        write(SOFTWARE, READ_CONTEXT.elementfocus, ``)
        writetext(SOFTWARE, READ_CONTEXT.elementfocus, `$white no boards found`)
        writetext(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `$white use @ to create a board`,
        )
        writetext(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `$white @board name of board`,
        )
      }
    }

    const booklist = memoryreadbooklist()
    for (let i = 0; i < booklist.length; ++i) {
      const book = booklist[i]
      if (book.id !== mainbook.id) {
        writeoption(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          'content',
          `${book.name} $GREEN${book.id}`,
        )
        const sorted = bookreadsortedcodepages(book)
        sorted
          .filter((page) => codepagereadtype(page) === CODE_PAGE_TYPE.BOARD)
          .forEach((page) => {
            const name = codepagereadname(page)
            write(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              `!boardopen ${page.id};$blue#goto $white$34 ${name} $34`,
            )
          })
      }
    }
    return 0
  })
  .command('trash', () => {
    writesection(SOFTWARE, READ_CONTEXT.elementfocus, `$REDTRASH`)
    writetext(SOFTWARE, READ_CONTEXT.elementfocus, `books`)
    const list = memoryreadbooklist()
    if (list.length) {
      list.forEach((book) => {
        write(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `!booktrash ${book.id};$REDTRASH ${book.name}`,
        )
      })
      write(SOFTWARE, READ_CONTEXT.elementfocus, '')
    }
    const book = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    if (ispresent(book)) {
      writetext(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        `pages in open ${book.name} book`,
      )
      book.pages.forEach((page) => {
        const name = codepagereadname(page)
        write(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `!pagetrash ${page.id};$REDTRASH ${name}`,
        )
      })
      write(SOFTWARE, READ_CONTEXT.elementfocus, '')
    }
    return 0
  })
  // -- content related commands
  .command('dev', () => {
    vm_flush_op()
    register_dev(SOFTWARE, READ_CONTEXT.elementfocus)
    return 0
  })
  .command('share', () => {
    vm_flush_op()
    register_share(SOFTWARE, READ_CONTEXT.elementfocus)
    return 0
  })
  .command('save', () => {
    vm_flush_op()
    return 0
  })
  .command('fork', () => {
    vm_fork(SOFTWARE, READ_CONTEXT.elementfocus)
    return 0
  })
  .command('itchiopublish', () => {
    vm_itchiopublish(SOFTWARE, READ_CONTEXT.elementfocus)
    return 0
  })
  .command('nuke', () => {
    register_nuke(SOFTWARE, READ_CONTEXT.elementfocus)
    return 0
  })
  .command('restart', () => {
    vm_restart(SOFTWARE, READ_CONTEXT.elementfocus)
    vm_flush_op()
    return 0
  })
  .command('export', () => {
    writeheader(SOFTWARE, READ_CONTEXT.elementfocus, `E X P O R T`)
    writesection(SOFTWARE, READ_CONTEXT.elementfocus, `books`)
    const list = memoryreadbooklist()
    if (list.length) {
      list.forEach((book) =>
        write(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `!bookexport ${book.id};${book.name}`,
        ),
      )
    }
    return 0
  })
  .command('bookexport', (_, words) => {
    const [address] = readargs(words, 0, [ARG_TYPE.NAME])
    const book = memoryreadbookbyaddress(address)
    if (ispresent(book)) {
      writeheader(SOFTWARE, READ_CONTEXT.elementfocus, `E X P O R T`)
      writesection(SOFTWARE, READ_CONTEXT.elementfocus, `pages`)
      setTimeout(() => {
        if (book.pages.length) {
          const sorted = bookreadsortedcodepages(book)
          write(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            `!bookallexport ${address};$blue[all]$white export book`,
          )
          sorted.forEach((page) => {
            const name = codepagereadname(page)
            const type = codepagereadtypetostring(page)
            write(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              `!pageexport ${address}:${page.id};$blue[${type}]$white ${name}`,
            )
          })
        }
      }, 1000)
    }
    return 0
  })
  .command('bookallexport', (_, words) => {
    const [address] = readargs(words, 0, [ARG_TYPE.NAME])
    const book = memoryreadbookbyaddress(address)
    if (ispresent(book)) {
      register_downloadjsonfile(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        deepcopy(book),
        `${book.name}.book.json`,
      )
    }
    return 0
  })
  .command('pageexport', (_, words) => {
    const [address] = readargs(words, 0, [ARG_TYPE.NAME])
    const { target, path } = parsetarget(address)
    const book = memoryreadbookbyaddress(target)
    const codepage = bookreadcodepagebyaddress(book, path)
    if (ispresent(codepage)) {
      register_downloadjsonfile(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        deepcopy(codepage),
        `${codepagereadname(codepage)}.${codepagereadtypetostring(codepage)}.json`,
      )
    }
    return 0
  })
  .command('gadget', () => {
    // gadget will turn on / off the built-in inspector
    register_inspector(SOFTWARE, READ_CONTEXT.elementfocus)
    return 0
  })
  // -- multiplayer related commands
  .command('joincode', (_, words) => {
    const [maybehidden] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
    bridge_start(SOFTWARE, READ_CONTEXT.elementfocus, !!maybehidden)
    return 0
  })
  .command('jointab', (_, words) => {
    const [maybehidden] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
    bridge_tab(SOFTWARE, READ_CONTEXT.elementfocus, !!maybehidden)
    return 0
  })
  // -- display related commands
  .command('startlookingglass', () => {
    register_enterar(SOFTWARE, READ_CONTEXT.elementfocus)
    return 0
  })
