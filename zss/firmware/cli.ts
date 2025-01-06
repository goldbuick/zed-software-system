import { maptostring } from 'zss/chip'
import {
  api_error,
  tape_editor_open,
  tape_info,
  vm_codeaddress,
  vm_flush,
  register_nuke,
  register_share,
  register_dev,
  peer_joincode,
  broadcast_startstream,
  broadcast_stopstream,
  chat_connect,
  chat_disconnect,
} from 'zss/device/api'
import { modemwriteinitstring } from 'zss/device/modem'
import { createfirmware } from 'zss/firmware'
import { ispresent, MAYBE } from 'zss/mapping/types'
import {
  MEMORY_LABEL,
  memoryclearbook,
  memorycreatesoftwarebook,
  memoryensuresoftwarebook,
  memoryensuresoftwarecodepage,
  memoryreadbookbyaddress,
  memoryreadbookbysoftware,
  memoryreadbooklist,
  memorysetsoftwarebook,
} from 'zss/memory'
import { bookclearcodepage, bookreadcodepagebyaddress } from 'zss/memory/book'
import { codepagereadname, codepagereadtypetostring } from 'zss/memory/codepage'
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
  writeoption,
  writesection,
  writetext,
} from 'zss/words/writeui'

function vm_flush_player(tag = '') {
  vm_flush('cli', tag, READ_CONTEXT.player)
}

export const CLI_FIRMWARE = createfirmware()
  // primary firmware
  .command('send', (_, words) => {
    const [msg, data] = readargs(words, 0, [ARG_TYPE.NAME, ARG_TYPE.ANY])
    switch (msg) {
      // help messages
      case 'helpmenu':
        writeheader('cli', `H E L P`)
        writeoption('cli', `#help controls`, `zss controls and inputs`)
        write('cli', `!helpcontrols;read help controls`)
        write('cli', ``)
        writeoption('cli', `#help text`, `text formatting`)
        write('cli', `!helptext;read help text`)
        write('cli', ``)
        writeoption('cli', `#help developer`, `developer commands`)
        write('cli', `!helpdeveloper;read help developer`)
        write('cli', ``)
        writeoption('cli', `#help player`, `player settings`)
        write('cli', `!helpplayer;read help player`)
        writesection('cli', `keyboard input`)
        writeoption('cli', `?`, `open console`)
        writeoption('cli', `esc`, `close console`)
        writeoption('cli', `tab`, `move console`)
        writeoption('cli', `up / down arrow keys`, `navigate console items`)
        writeoption('cli', `left / right arrow keys`, `change console items`)
        writeoption('cli', `enter`, `interact with console items`)
        writeoption('cli', `alt + arrow keys`, `skip words and console lines`)
        writeoption('cli', `${metakey} + up / down arrow keys`, `input history`)
        break
      case 'helpcontrols':
        writeheader('cli', `zss controls and inputs`)
        writesection('cli', `keyboard input`)
        writeoption('cli', `arrow keys`, `move`)
        writeoption('cli', `shift + arrow keys`, `shoot`)
        writeoption('cli', `enter`, `ok / accept`)
        writeoption('cli', `escape`, `cancel / close`)
        writeoption('cli', `tab`, `menu / action`)
        writesection('cli', `mouse input`)
        writetext('cli', `todo ???`)
        writesection('cli', `controller input`)
        writeoption('cli', `left stick`, `move`)
        writeoption('cli', `right stick`, `aim`)
        writeoption('cli', `a`, `ok / accept`)
        writeoption('cli', `b`, `cancel / close`)
        writeoption('cli', `y`, `menu / action`)
        writeoption('cli', `x`, `shoot`)
        writeoption('cli', `triggers`, `shoot`)
        break
      case 'helptext':
        writeheader('cli', `text formatting`)
        writesection('cli', `typography`)
        writetext('cli', `plain text`)
        writetext('cli', `$centering text`)
        writetext('cli', `"\\"@quoted strings for special chars\\""`)
        writetext('cli', `$$0-255 for ascii chars $159$176$240`)
        writetext(
          'cli',
          `use color names like ${fg('red', '$$red')} to change foreground color`,
        )
        writetext(
          'cli',
          `use color names like ${bg('ongreen', '$$ongreen')} to change background color`,
        )
        writetext(
          'cli',
          `use clear ${bg('onclear', 'to change background to')} transparent`,
        )
        writesection('cli', `hyperlinks`)
        writetext(
          'cli',
          `${fg('white', '"!hotkey"')} message shortcut;${fg('gray', 'Label')}`,
        )
        writetext(
          'cli',
          `${fg('white', '"!range"')} flag [labelmin] [labelmax];${fg('gray', 'Input Label')}`,
        )
        writetext(
          'cli',
          `${fg('white', '"!select"')} flag ...list of values;${fg('gray', 'Input Label')}`,
        )
        writetext(
          'cli',
          `${fg('white', '"!number"')} flag [minvalue] [maxvalue];${fg('gray', 'Input Label')}`,
        )
        writetext(
          'cli',
          `${fg('white', '"!text"')} flag;${fg('gray', 'Input Label')}`,
        )
        writetext(
          'cli',
          `${fg('white', '"!copyit"')} flag;${fg('gray', 'Input Label')}`,
        )
        break
      case 'helpdeveloper':
        writeheader('cli', `developer commands`)
        writeoption('cli', `#books`, `list books in memory`)
        writeoption('cli', `#pages`, `list pages in opened book`)
        writeoption(
          'cli',
          `@[pagetype:]page name`,
          `create & edit a new codepage in the currently opened book`,
        )
        writeoption(
          'cli',
          `#trash`,
          `list books and pages from open book you can delete`,
        )
        writeoption('cli', `#save`, `flush state to register`)
        break
      case 'helpplayer':
        writeheader('cli', `player settings`)
        writetext('cli', `todo`)
        break
      default:
        tape_info('$2', `${msg} ${data ?? ''}`)
        break
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
    tape_info('$2', text)
    return 0
  })
  .command('hyperlink', (_, args) => {
    const [labelword, ...words] = args
    const label = maptostring(labelword)
    const hyperlink = words.map(maptostring).join(' ')
    tape_info('$2', `!${hyperlink};${label}`)
    return 0
  })
  // ---
  .command('dev', () => {
    vm_flush_player()
    register_dev('cli', READ_CONTEXT.player)
    return 0
  })
  .command('share', () => {
    vm_flush_player()
    register_share('cli', READ_CONTEXT.player)
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
  .command('bookopen', (chip, words) => {
    const [name] = readargs(words, 0, [ARG_TYPE.NAME])

    const book = memoryreadbookbyaddress(name)
    if (ispresent(book)) {
      writetext('cli', `opened [book] ${book.name}`)
      memorysetsoftwarebook(MEMORY_LABEL.MAIN, book.id)
      chip.command('pages')
    } else {
      api_error(
        'cli',
        'bookopen',
        `book ${name} not found`,
        READ_CONTEXT.player,
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
      writetext('cli', `trashed [book] ${book.name}`)
      vm_flush_player()
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
      writetext('cli', `opened [${pagetype}] ${name}`)

      // write to modem
      modemwriteinitstring(
        vm_codeaddress(mainbook.id, codepage.id),
        codepage.code,
      )

      // tell tape to open a code editor for given page
      const type = codepagereadtypetostring(codepage)
      tape_editor_open(
        'cli',
        mainbook.id,
        codepage.id,
        type,
        `${name} - ${mainbook.name}`,
        READ_CONTEXT.player,
      )
    } else {
      api_error(
        'cli',
        'pageopen',
        `page ${page} not found`,
        READ_CONTEXT.player,
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
      writetext('cli', `trashed [${pagetype}] ${name}`)
      vm_flush_player()
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
    writesection('cli', `books`)
    const main = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    writeoption(
      'cli',
      'main',
      `${main?.name ?? 'empty'} $GREEN${main?.id ?? ''}`,
    )
    const content = memoryreadbookbysoftware(MEMORY_LABEL.CONTENT)
    writeoption(
      'cli',
      'content',
      `${content?.name ?? 'empty'} ${content?.id ?? ''}`,
    )
    writebbar('cli', 7)
    const list = memoryreadbooklist()
    if (list.length) {
      list.forEach((book) => {
        write('cli', `!bookopen ${book.id};${book.name}`)
      })
    } else {
      writetext('cli', `no books found`)
    }
    write('cli', `!bookcreate;create a new book`)
    return 0
  })
  .command('pages', () => {
    writesection('cli', `pages`)
    const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
    if (ispresent(mainbook)) {
      writeoption('cli', 'main', `${mainbook.name} $GREEN${mainbook.id}`)
      if (mainbook.pages.length) {
        mainbook.pages.forEach((page) => {
          const name = codepagereadname(page)
          const type = codepagereadtypetostring(page)
          write('cli', `!pageopen ${page.id};[${type}] ${name}`)
        })
      } else {
        write('cli', ``)
        writetext('cli', `no pages found`)
        writetext('cli', `use @ to create a page`)
        writetext('cli', `@board name of board`)
        writetext('cli', `@object name of object`)
        writetext('cli', `@terrain name of terrain`)
        writetext('cli', `You can omit the type and it will default to object`)
        writetext('cli', `@object name of object`)
        writetext('cli', `@name of object`)
      }
    }
    return 0
  })
  .command('trash', () => {
    writesection('cli', `$REDTRASH`)
    writetext('cli', `books`)
    const list = memoryreadbooklist()
    if (list.length) {
      list.forEach((book) => {
        write('cli', `!booktrash ${book.id};$REDTRASH ${book.name}`)
      })
      write('cli', '')
    }
    const book = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    if (ispresent(book)) {
      writetext('cli', `pages in open ${book.name} book`)
      book.pages.forEach((page) => {
        const name = codepagereadname(page)
        write('cli', `!pagetrash ${page.id};$REDTRASH ${name}`)
      })
      write('cli', '')
    }
    return 0
  })
  .command('save', () => {
    vm_flush_player()
    return 0
  })
  .command('savewith', (_, words) => {
    const [tag] = readargs(words, 0, [ARG_TYPE.NAME])
    vm_flush_player(tag)
    return 0
  })
  .command('nuke', () => {
    register_nuke('cli', READ_CONTEXT.player)
    return 0
  })
  .command('joincode', () => {
    peer_joincode('cli', READ_CONTEXT.player)
    return 0
  })
  .command('chat', (_, words) => {
    const [maybechannel] = readargs(words, 0, [ARG_TYPE.NAME])
    switch (NAME(maybechannel)) {
      default:
        chat_connect('cli', maybechannel, READ_CONTEXT.player)
        break
      case 'close':
        chat_disconnect('cli', READ_CONTEXT.player)
        break
    }
    return 0
  })
  .command('broadcast', (_, words) => {
    const [maybestreamkey] = readargs(words, 0, [ARG_TYPE.NAME])
    switch (NAME(maybestreamkey)) {
      default:
        broadcast_startstream('cli', maybestreamkey, READ_CONTEXT.player)
        break
      case 'stop':
        broadcast_stopstream('cli', READ_CONTEXT.player)
        break
    }
    return 0
  })
