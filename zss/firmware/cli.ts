import { parsetarget } from 'zss/device'
import {
  api_error,
  register_editor_open,
  api_info,
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
import { text, tokenize } from 'zss/lang/lexer'
import { pick } from 'zss/mapping/array'
import { randominteger } from 'zss/mapping/number'
import { totarget } from 'zss/mapping/string'
import { deepcopy, ispresent, MAYBE } from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import {
  MEMORY_LABEL,
  memoryclearbook,
  memorycreatesoftwarebook,
  memoryensuresoftwarebook,
  memoryensuresoftwarecodepage,
  memoryreadbookbyaddress,
  memoryreadbookbysoftware,
  memoryreadbooklist,
  memoryreadoperator,
  memorysendtoactiveboards,
  memorysetsoftwarebook,
} from 'zss/memory'
import {
  bookclearcodepage,
  bookelementdisplayread,
  bookplayermovetoboard,
  bookreadcodepagebyaddress,
  bookreadcodepagesbytypeandstat,
  bookreadsortedcodepages,
} from 'zss/memory/book'
import {
  codepagereadname,
  codepagereadtype,
  codepagereadtypetostring,
} from 'zss/memory/codepage'
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CODE_PAGE,
  CODE_PAGE_TYPE,
} from 'zss/memory/types'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'
import { stattypestring } from 'zss/words/stats'
import { metakey } from 'zss/words/system'
import { COLOR, NAME, STAT_TYPE } from 'zss/words/types'

function vm_flush_op() {
  vm_flush(SOFTWARE, memoryreadoperator())
}

export const CLI_FIRMWARE = createfirmware()
  // primary firmware
  .command('send', (_, words) => {
    const [target, data] = readargs(words, 0, [ARG_TYPE.NAME, ARG_TYPE.ANY])
    switch (NAME(target)) {
      // help messages
      case 'helpmenu':
        writeheader(SOFTWARE, READ_CONTEXT.elementfocus, `H E L P`)
        // TODO: basically make this help content a table of contents
        // entry points into the help wiki +1
        write(SOFTWARE, READ_CONTEXT.elementfocus, ``)
        writeoption(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `#help controls`,
          `zss controls and inputs`,
        )
        write(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `!helpcontrols;read help controls`,
        )
        write(SOFTWARE, READ_CONTEXT.elementfocus, ``)
        writeoption(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `#help text`,
          `text formatting`,
        )
        write(SOFTWARE, READ_CONTEXT.elementfocus, `!helptext;read help text`)
        write(SOFTWARE, READ_CONTEXT.elementfocus, ``)
        writeoption(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `#help developer`,
          `developer commands`,
        )
        write(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `!helpdeveloper;read help developer`,
        )
        write(SOFTWARE, READ_CONTEXT.elementfocus, ``)
        writeoption(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `#help player`,
          `player settings`,
        )
        write(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `!helpplayer;read help player`,
        )
        writesection(SOFTWARE, READ_CONTEXT.elementfocus, `keyboard input`)
        writeoption(SOFTWARE, READ_CONTEXT.elementfocus, `?`, `open console`)
        writeoption(SOFTWARE, READ_CONTEXT.elementfocus, `esc`, `close console`)
        writeoption(SOFTWARE, READ_CONTEXT.elementfocus, `tab`, `move console`)
        writeoption(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `up / down arrow keys`,
          `navigate console items`,
        )
        writeoption(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `left / right arrow keys`,
          `change console items`,
        )
        writeoption(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `enter`,
          `interact with console items`,
        )
        writeoption(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `alt + arrow keys`,
          `skip words and console lines`,
        )
        writeoption(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `${metakey} + up / down arrow keys`,
          `input history`,
        )
        break
      case 'helpcontrols':
        writeheader(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `zss controls and inputs`,
        )
        writesection(SOFTWARE, READ_CONTEXT.elementfocus, `keyboard input`)
        writeoption(SOFTWARE, READ_CONTEXT.elementfocus, `arrow keys`, `move`)
        writeoption(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `shift + arrow keys`,
          `shoot`,
        )
        writeoption(SOFTWARE, READ_CONTEXT.elementfocus, `enter`, `ok / accept`)
        writeoption(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `escape`,
          `cancel / close`,
        )
        writeoption(SOFTWARE, READ_CONTEXT.elementfocus, `tab`, `menu / action`)
        writesection(SOFTWARE, READ_CONTEXT.elementfocus, `controller input`)
        writeoption(SOFTWARE, READ_CONTEXT.elementfocus, `left stick`, `move`)
        writeoption(SOFTWARE, READ_CONTEXT.elementfocus, `right stick`, `aim`)
        writeoption(SOFTWARE, READ_CONTEXT.elementfocus, `a`, `ok / accept`)
        writeoption(SOFTWARE, READ_CONTEXT.elementfocus, `b`, `cancel / close`)
        writeoption(SOFTWARE, READ_CONTEXT.elementfocus, `y`, `menu / action`)
        writeoption(SOFTWARE, READ_CONTEXT.elementfocus, `x`, `shoot`)
        writeoption(SOFTWARE, READ_CONTEXT.elementfocus, `triggers`, `shoot`)
        break
      case 'helptext':
        // writeheader(SOFTWARE, `text formatting`)
        // writesection(SOFTWARE, `typography`)
        // writetext(SOFTWARE, `plain text`)
        // writetext(SOFTWARE, `$centering text`)
        // writetext(SOFTWARE, `"\\"@quoted strings for special chars\\""`)
        // writetext(SOFTWARE, `$$0-255 for ascii chars $159$176$240`)
        // writetext(
        //   SOFTWARE,
        //   `use color names like ${fg('red', '$$red')} to change foreground color`,
        // )
        // writetext(
        //   SOFTWARE,
        //   `use color names like ${bg('ongreen', '$$ongreen')} to change background color`,
        // )
        // writetext(
        //   SOFTWARE,
        //   `use clear ${bg('onclear', 'to change background to')} transparent`,
        // )
        // writesection(SOFTWARE, `hyperlinks`)
        // writetext(
        //   SOFTWARE,
        //   `${fg('white', '"!hotkey"')} message shortcut;${fg('gray', 'Label')}`,
        // )
        // writetext(
        //   SOFTWARE,
        //   `${fg('white', '"!range"')} flag [labelmin] [labelmax];${fg('gray', 'Input Label')}`,
        // )
        // writetext(
        //   SOFTWARE,
        //   `${fg('white', '"!select"')} flag ...list of values;${fg('gray', 'Input Label')}`,
        // )
        // writetext(
        //   SOFTWARE,
        //   `${fg('white', '"!number"')} flag [minvalue] [maxvalue];${fg('gray', 'Input Label')}`,
        // )
        // writetext(
        //   SOFTWARE,
        //   READ_CONTEXT.elementfocus,
        //   `${fg('white', '"!text"')} flag;${fg('gray', 'Input Label')}`,
        // )
        // writetext(
        //   SOFTWARE,
        //   READ_CONTEXT.elementfocus,
        //   `${fg('white', '"!copyit"')} flag;${fg('gray', 'Input Label')}`,
        // )
        // writetext(
        //   SOFTWARE,
        //   READ_CONTEXT.elementfocus,
        //   `${fg('white', '"!openit"')} flag;${fg('gray', 'Input Label')}`,
        // )
        break
      case 'helpdeveloper':
        writeheader(SOFTWARE, READ_CONTEXT.elementfocus, `developer commands`)
        writeoption(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `#books`,
          `list books in memory`,
        )
        writeoption(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `#pages`,
          `list pages in opened book`,
        )
        writeoption(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `@[pagetype:]page name`,
          `create & edit a new codepage in the currently opened book`,
        )
        writeoption(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `#trash`,
          `list books and pages from open book you can delete`,
        )
        writeoption(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `#save`,
          `flush state to register`,
        )
        writeoption(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `#share`,
          `creates a click to copy share url and QR code`,
        )
        break
      case 'helpplayer':
        writeheader(SOFTWARE, READ_CONTEXT.elementfocus, `player settings`)
        writetext(SOFTWARE, READ_CONTEXT.elementfocus, `todo`)
        break
      default: {
        const [msgtarget, msglabel] = totarget(target)
        memorysendtoactiveboards(
          msgtarget === 'self' && READ_CONTEXT.elementisplayer
            ? `${READ_CONTEXT.elementfocus}:${msglabel}`
            : target,
          data,
        )
        break
      }
    }

    return 0
  })
  .command('stat', (chip, words) => {
    // create / open content
    let codepage: MAYBE<CODE_PAGE>
    const [maybetype, ...args] = words.map(maptostring)
    const maybename = args.join(' ')
    // attempt to check first word as codepage type to create
    switch (NAME(maybetype)) {
      case stattypestring(STAT_TYPE.LOADER):
        codepage = memoryensuresoftwarecodepage(
          MEMORY_LABEL.CONTENT,
          maybename,
          CODE_PAGE_TYPE.LOADER,
        )
        break
      default:
        codepage = memoryensuresoftwarecodepage(
          MEMORY_LABEL.CONTENT,
          [maybetype, ...args].join(' '),
          CODE_PAGE_TYPE.OBJECT,
        )
        break
      case stattypestring(STAT_TYPE.BOARD):
        codepage = memoryensuresoftwarecodepage(
          MEMORY_LABEL.CONTENT,
          maybename,
          CODE_PAGE_TYPE.BOARD,
        )
        break
      case stattypestring(STAT_TYPE.OBJECT):
        codepage = memoryensuresoftwarecodepage(
          MEMORY_LABEL.CONTENT,
          maybename,
          CODE_PAGE_TYPE.OBJECT,
        )
        break
      case stattypestring(STAT_TYPE.TERRAIN):
        codepage = memoryensuresoftwarecodepage(
          MEMORY_LABEL.CONTENT,
          maybename,
          CODE_PAGE_TYPE.TERRAIN,
        )
        break
      case stattypestring(STAT_TYPE.CHARSET):
        codepage = memoryensuresoftwarecodepage(
          MEMORY_LABEL.CONTENT,
          maybename,
          CODE_PAGE_TYPE.CHARSET,
        )
        break
      case stattypestring(STAT_TYPE.PALETTE):
        codepage = memoryensuresoftwarecodepage(
          MEMORY_LABEL.CONTENT,
          maybename,
          CODE_PAGE_TYPE.PALETTE,
        )
        break
    }
    if (ispresent(codepage)) {
      chip.command('pageopen', codepage.id)
    }
    return 0
  })
  .command('text', (_, words) => {
    const text = words.map(maptostring).join(' ')
    if (ispresent(READ_CONTEXT.element)) {
      // $WOBBLE $BOUNCE $SPIN
      READ_CONTEXT.element.tickertext = text
      READ_CONTEXT.element.tickertime = READ_CONTEXT.timestamp
      const icon = bookelementdisplayread(
        READ_CONTEXT.book,
        READ_CONTEXT.element,
        1,
        COLOR.WHITE,
        COLOR.BLACK,
      )
      api_log(
        SOFTWARE,
        READ_CONTEXT.elementid,
        `$${COLOR[icon.color]}$ON${COLOR[icon.bg]}$${icon.char}$ONCLEAR ${text}`,
      )
    }
    return 0
  })
  .command('hyperlink', (_, args) => {
    const [labelword, ...words] = args
    const label = maptostring(labelword)
    const hyperlink = words.map(maptostring).join(' ')
    api_info(SOFTWARE, READ_CONTEXT.elementfocus, `!${hyperlink};${label}`)
    return 0
  })
  // ---
  .command('bookcreate', (chip, words) => {
    const [maybename] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])

    const book = memorycreatesoftwarebook(maybename)
    if (ispresent(book)) {
      chip.command('bookopen', book.id)
    }
    return 0
  })
  .command('bookopen', (chip, words) => {
    const [name] = readargs(words, 0, [ARG_TYPE.NAME])

    const book = memoryreadbookbyaddress(name)
    if (ispresent(book)) {
      api_log(SOFTWARE, READ_CONTEXT.elementfocus, `opened [book] ${book.name}`)
      memorysetsoftwarebook(MEMORY_LABEL.MAIN, book.id)
      chip.command('pages')
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
    const boards = bookreadcodepagesbytypeandstat(
      READ_CONTEXT.book,
      CODE_PAGE_TYPE.BOARD,
      stat,
    )
    if (boards.length) {
      const target = pick(...boards)
      if (ispresent(target)) {
        bookplayermovetoboard(
          READ_CONTEXT.book,
          READ_CONTEXT.elementfocus,
          target.id,
          {
            x: randominteger(0, BOARD_WIDTH - 1),
            y: randominteger(0, BOARD_HEIGHT - 1),
          },
        )
      }
    }
    return 0
  })
  .command('pageopenwith', (chip, words) => {
    const [refsheet, page, maybeobject] = readargs(words, 0, [
      ARG_TYPE.NAME,
      ARG_TYPE.MAYBE_NAME,
      ARG_TYPE.MAYBE_NAME,
    ])
    return chip.command('pageopen', page, maybeobject, refsheet)
  })
  .command('pageopen', (_, words) => {
    const [page, maybeobject, mayberefsheet] = readargs(words, 0, [
      ARG_TYPE.NAME,
      ARG_TYPE.MAYBE_NAME,
      ARG_TYPE.MAYBE_NAME,
    ])

    // create book if needed
    const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
    if (!ispresent(mainbook)) {
      return 0
    }

    const codepage = bookreadcodepagebyaddress(mainbook, page)
    if (ispresent(codepage)) {
      const name = codepagereadname(codepage)
      const pagetype = codepagereadtypetostring(codepage)
      api_log(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        `opened [${pagetype}] ${name}`,
      )

      // parse and pull lines of text
      const refsheetlines: string[] = []
      const refsheet = bookreadcodepagebyaddress(mainbook, mayberefsheet ?? '')
      const parse = ispresent(refsheet) ? tokenize(refsheet.code) : undefined
      if (ispresent(parse)) {
        for (let i = 0; i < parse.tokens.length; ++i) {
          const token = parse.tokens[i]
          if (token.tokenType === text) {
            refsheetlines.push(
              token.image.startsWith('"') ? token.image.slice(1) : token.image,
            )
          }
        }
      }

      // path
      const path = [codepage.id, maybeobject]

      // write to modem
      modemwriteinitstring(vm_codeaddress(mainbook.id, path), codepage.code)

      // tell tape to open a code editor for given page
      const type = codepagereadtypetostring(codepage)
      register_editor_open(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        mainbook.id,
        path,
        type,
        `${name} - ${mainbook.name}`,
        refsheetlines,
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
    const content = memoryreadbookbysoftware(MEMORY_LABEL.CONTENT)
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
          const type = codepagereadtypetostring(page)
          write(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            `!boardopen ${page.id};$blue[${type}]$white ${name}`,
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
