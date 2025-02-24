import {
  api_error,
  tape_editor_open,
  tape_info,
  vm_codeaddress,
  vm_flush,
  register_nuke,
  register_share,
  register_dev,
  network_start,
  broadcast_startstream,
  broadcast_stopstream,
  tape_inspector,
  vm_restart,
} from 'zss/device/api'
import { modemwriteinitstring } from 'zss/device/modem'
import { SOFTWARE } from 'zss/device/session'
import { createfirmware } from 'zss/firmware'
import { ispresent, MAYBE } from 'zss/mapping/types'
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
import { bookclearcodepage, bookreadcodepagebyaddress } from 'zss/memory/book'
import {
  codepagereadname,
  codepagereadtype,
  codepagereadtypetostring,
} from 'zss/memory/codepage'
import { CODE_PAGE, CODE_PAGE_TYPE } from 'zss/memory/types'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'
import { stattypestring } from 'zss/words/stats'
import { metakey } from 'zss/words/system'
import { NAME, STAT_TYPE } from 'zss/words/types'
import {
  bg,
  fg,
  write,
  writebbar,
  writeheader,
  writeopenit,
  writeoption,
  writesection,
  writetext,
} from 'zss/words/writeui'

function vm_flush_op(tag = '') {
  vm_flush(SOFTWARE, tag, memoryreadoperator())
}

export const CLI_FIRMWARE = createfirmware()
  // primary firmware
  .command('send', (_, words) => {
    const [target, data] = readargs(words, 0, [ARG_TYPE.NAME, ARG_TYPE.ANY])
    switch (NAME(target)) {
      // help messages
      case 'helpmenu':
        writeheader(SOFTWARE, `H E L P`)
        // TODO: basically make this help content a table of contents
        // entry points into the help wiki +1
        writeopenit(
          SOFTWARE,
          `https://github.com/goldbuick/zed-software-system/wiki`,
          `open help wiki`,
        )
        write(SOFTWARE, ``)
        writeoption(SOFTWARE, `#help controls`, `zss controls and inputs`)
        write(SOFTWARE, `!helpcontrols;read help controls`)
        write(SOFTWARE, ``)
        writeoption(SOFTWARE, `#help text`, `text formatting`)
        write(SOFTWARE, `!helptext;read help text`)
        write(SOFTWARE, ``)
        writeoption(SOFTWARE, `#help developer`, `developer commands`)
        write(SOFTWARE, `!helpdeveloper;read help developer`)
        write(SOFTWARE, ``)
        writeoption(SOFTWARE, `#help player`, `player settings`)
        write(SOFTWARE, `!helpplayer;read help player`)
        writesection(SOFTWARE, `keyboard input`)
        writeoption(SOFTWARE, `?`, `open console`)
        writeoption(SOFTWARE, `esc`, `close console`)
        writeoption(SOFTWARE, `tab`, `move console`)
        writeoption(SOFTWARE, `up / down arrow keys`, `navigate console items`)
        writeoption(SOFTWARE, `left / right arrow keys`, `change console items`)
        writeoption(SOFTWARE, `enter`, `interact with console items`)
        writeoption(
          SOFTWARE,
          `alt + arrow keys`,
          `skip words and console lines`,
        )
        writeoption(
          SOFTWARE,
          `${metakey} + up / down arrow keys`,
          `input history`,
        )
        break
      case 'helpcontrols':
        writeheader(SOFTWARE, `zss controls and inputs`)
        writesection(SOFTWARE, `keyboard input`)
        writeoption(SOFTWARE, `arrow keys`, `move`)
        writeoption(SOFTWARE, `shift + arrow keys`, `shoot`)
        writeoption(SOFTWARE, `enter`, `ok / accept`)
        writeoption(SOFTWARE, `escape`, `cancel / close`)
        writeoption(SOFTWARE, `tab`, `menu / action`)
        writesection(SOFTWARE, `mouse input`)
        writetext(SOFTWARE, `todo ???`)
        writesection(SOFTWARE, `controller input`)
        writeoption(SOFTWARE, `left stick`, `move`)
        writeoption(SOFTWARE, `right stick`, `aim`)
        writeoption(SOFTWARE, `a`, `ok / accept`)
        writeoption(SOFTWARE, `b`, `cancel / close`)
        writeoption(SOFTWARE, `y`, `menu / action`)
        writeoption(SOFTWARE, `x`, `shoot`)
        writeoption(SOFTWARE, `triggers`, `shoot`)
        break
      case 'helptext':
        writeheader(SOFTWARE, `text formatting`)
        writesection(SOFTWARE, `typography`)
        writetext(SOFTWARE, `plain text`)
        writetext(SOFTWARE, `$centering text`)
        writetext(SOFTWARE, `"\\"@quoted strings for special chars\\""`)
        writetext(SOFTWARE, `$$0-255 for ascii chars $159$176$240`)
        writetext(
          SOFTWARE,
          `use color names like ${fg('red', '$$red')} to change foreground color`,
        )
        writetext(
          SOFTWARE,
          `use color names like ${bg('ongreen', '$$ongreen')} to change background color`,
        )
        writetext(
          SOFTWARE,
          `use clear ${bg('onclear', 'to change background to')} transparent`,
        )
        writesection(SOFTWARE, `hyperlinks`)
        writetext(
          SOFTWARE,
          `${fg('white', '"!hotkey"')} message shortcut;${fg('gray', 'Label')}`,
        )
        writetext(
          SOFTWARE,
          `${fg('white', '"!range"')} flag [labelmin] [labelmax];${fg('gray', 'Input Label')}`,
        )
        writetext(
          SOFTWARE,
          `${fg('white', '"!select"')} flag ...list of values;${fg('gray', 'Input Label')}`,
        )
        writetext(
          SOFTWARE,
          `${fg('white', '"!number"')} flag [minvalue] [maxvalue];${fg('gray', 'Input Label')}`,
        )
        writetext(
          SOFTWARE,
          `${fg('white', '"!text"')} flag;${fg('gray', 'Input Label')}`,
        )
        writetext(
          SOFTWARE,
          `${fg('white', '"!copyit"')} flag;${fg('gray', 'Input Label')}`,
        )
        writetext(
          SOFTWARE,
          `${fg('white', '"!openit"')} flag;${fg('gray', 'Input Label')}`,
        )
        break
      case 'helpdeveloper':
        writeheader(SOFTWARE, `developer commands`)
        writeoption(SOFTWARE, `#books`, `list books in memory`)
        writeoption(SOFTWARE, `#pages`, `list pages in opened book`)
        writeoption(
          SOFTWARE,
          `@[pagetype:]page name`,
          `create & edit a new codepage in the currently opened book`,
        )
        writeoption(
          SOFTWARE,
          `#trash`,
          `list books and pages from open book you can delete`,
        )
        writeoption(SOFTWARE, `#save`, `flush state to register`)
        break
      case 'helpplayer':
        writeheader(SOFTWARE, `player settings`)
        writetext(SOFTWARE, `todo`)
        break
      default: {
        memorysendtoactiveboards(target, data)
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
    tape_info(SOFTWARE, text)
    return 0
  })
  .command('hyperlink', (_, args) => {
    const [labelword, ...words] = args
    const label = maptostring(labelword)
    const hyperlink = words.map(maptostring).join(' ')
    tape_info(SOFTWARE, `!${hyperlink};${label}`)
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
      writetext(SOFTWARE, `opened [book] ${book.name}`)
      memorysetsoftwarebook(MEMORY_LABEL.MAIN, book.id)
      chip.command('pages')
    } else {
      api_error(
        SOFTWARE,
        'bookopen',
        `book ${name} not found`,
        READ_CONTEXT.elementfocus,
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
      writetext(SOFTWARE, `trashed [book] ${book.name}`)
      vm_flush_op()
      // reset to good state
      chip.command('pages')
    }
    return 0
  })
  .command('pageopen', (_, words) => {
    const [page] = readargs(words, 0, [ARG_TYPE.NAME])

    // create book if needed
    const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
    if (!ispresent(mainbook)) {
      return 0
    }

    const codepage = bookreadcodepagebyaddress(mainbook, page)
    if (ispresent(codepage)) {
      const name = codepagereadname(codepage)
      const pagetype = codepagereadtypetostring(codepage)
      writetext(SOFTWARE, `opened [${pagetype}] ${name}`)

      // write to modem
      modemwriteinitstring(
        vm_codeaddress(mainbook.id, [codepage.id]),
        codepage.code,
      )

      // tell tape to open a code editor for given page
      const type = codepagereadtypetostring(codepage)
      tape_editor_open(
        SOFTWARE,
        mainbook.id,
        [codepage.id],
        type,
        `${name} - ${mainbook.name}`,
        READ_CONTEXT.elementfocus,
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
      writetext(SOFTWARE, `trashed [${pagetype}] ${name}`)
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
    writesection(SOFTWARE, `books`)
    const main = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    writeoption(
      SOFTWARE,
      'main',
      `${main?.name ?? 'empty'} $GREEN${main?.id ?? ''}`,
    )
    const content = memoryreadbookbysoftware(MEMORY_LABEL.CONTENT)
    writeoption(
      SOFTWARE,
      'content',
      `${content?.name ?? 'empty'} ${content?.id ?? ''}`,
    )
    writebbar(SOFTWARE, 7)
    const list = memoryreadbooklist()
    if (list.length) {
      list.forEach((book) => {
        write(SOFTWARE, `!bookopen ${book.id};${book.name}`)
      })
    } else {
      writetext(SOFTWARE, `no books found`)
    }
    write(SOFTWARE, `!bookcreate;create a new book`)
    return 0
  })
  .command('pages', () => {
    writesection(SOFTWARE, `pages`)
    const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
    if (ispresent(mainbook)) {
      writeoption(SOFTWARE, 'main', `${mainbook.name} $GREEN${mainbook.id}`)
      if (mainbook.pages.length) {
        const sorted = [...mainbook.pages].sort((a, b) => {
          const atype = codepagereadtype(a)
          const btype = codepagereadtype(b)
          if (atype === btype) {
            return codepagereadname(a).localeCompare(codepagereadname(b))
          }
          return btype - atype
        })
        sorted.forEach((page) => {
          const name = codepagereadname(page)
          const type = codepagereadtypetostring(page)
          write(SOFTWARE, `!pageopen ${page.id};[${type}] ${name}`)
        })
      } else {
        write(SOFTWARE, ``)
        writetext(SOFTWARE, `no pages found`)
        writetext(SOFTWARE, `use @ to create a page`)
        writetext(SOFTWARE, `@board name of board`)
        writetext(SOFTWARE, `@object name of object`)
        writetext(SOFTWARE, `@terrain name of terrain`)
        writetext(
          SOFTWARE,
          `You can omit the type and it will default to object`,
        )
        writetext(SOFTWARE, `@object name of object`)
        writetext(SOFTWARE, `@name of object`)
      }
    }
    return 0
  })
  .command('trash', () => {
    writesection(SOFTWARE, `$REDTRASH`)
    writetext(SOFTWARE, `books`)
    const list = memoryreadbooklist()
    if (list.length) {
      list.forEach((book) => {
        write(SOFTWARE, `!booktrash ${book.id};$REDTRASH ${book.name}`)
      })
      write(SOFTWARE, '')
    }
    const book = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    if (ispresent(book)) {
      writetext(SOFTWARE, `pages in open ${book.name} book`)
      book.pages.forEach((page) => {
        const name = codepagereadname(page)
        write(SOFTWARE, `!pagetrash ${page.id};$REDTRASH ${name}`)
      })
      write(SOFTWARE, '')
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
  .command('savewith', (_, words) => {
    const [tag] = readargs(words, 0, [ARG_TYPE.NAME])
    vm_flush_op(tag)
    return 0
  })
  .command('nuke', () => {
    register_nuke(SOFTWARE, READ_CONTEXT.elementfocus)
    return 0
  })
  .command('restart', () => {
    vm_restart(SOFTWARE, READ_CONTEXT.elementfocus)
    return 0
  })
  .command('gadget', () => {
    // gadget will turn on / off the built-in inspector
    tape_inspector(SOFTWARE, undefined, READ_CONTEXT.elementfocus)
    return 0
  })
  // -- multiplayer related commands
  .command('joincode', () => {
    network_start(SOFTWARE, READ_CONTEXT.elementfocus)
    return 0
  })
  .command('twitchbroadcast', (_, words) => {
    const [maybestreamkey] = readargs(words, 0, [ARG_TYPE.NAME])
    switch (NAME(maybestreamkey)) {
      default:
        broadcast_startstream(
          SOFTWARE,
          maybestreamkey,
          READ_CONTEXT.elementfocus,
        )
        break
      case 'stop':
        broadcast_stopstream(SOFTWARE, READ_CONTEXT.elementfocus)
        break
    }
    return 0
  })
