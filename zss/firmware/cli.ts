import { parsetarget } from 'zss/device'
import {
  api_chat,
  api_error,
  api_log,
  bridge_chatstart,
  bridge_chatstop,
  bridge_start,
  bridge_streamstart,
  bridge_streamstop,
  bridge_tab,
  register_config,
  register_configshow,
  register_dev,
  register_downloadjsonfile,
  register_editor_open,
  register_findany,
  register_inspector,
  register_nuke,
  register_share,
  vm_admin,
  vm_codeaddress,
  vm_flush,
  vm_fork,
  vm_itchiopublish,
  vm_loader,
  vm_logout,
  vm_makeitscroll,
  vm_restart,
  vm_zztrandom,
  vm_zztsearch,
} from 'zss/device/api'
import { modemwriteinitstring } from 'zss/device/modem'
import { SOFTWARE } from 'zss/device/session'
import { romparse, romprint, romread } from 'zss/feature/rom'
import {
  write,
  writebbar,
  writeheader,
  writeoption,
  writesection,
  writetext,
} from 'zss/feature/writeui'
import { createfirmware } from 'zss/firmware'
import { randominteger } from 'zss/mapping/number'
import {
  MAYBE,
  deepcopy,
  isarray,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import {
  MEMORY_LABEL,
  memoryboardread,
  memoryclearbook,
  memorycreatesoftwarebook,
  memoryensuresoftwarebook,
  memoryreadbookbyaddress,
  memoryreadbookbysoftware,
  memoryreadbooklist,
  memoryreadflags,
  memoryreadoperator,
  memoryreadplayerboard,
  memorysendtoboards,
  memorysetsoftwarebook,
} from 'zss/memory'
import {
  bookclearcodepage,
  bookelementdisplayread,
  bookreadcodepagebyaddress,
  bookreadsortedcodepages,
  bookupdatename,
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
import { ispt } from 'zss/words/dir'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'
import { SEND_META, parsesend } from 'zss/words/send'
import { COLOR } from 'zss/words/types'

function isoperator(player: string) {
  return player === memoryreadoperator()
}

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

    if (send.targetname === 'self') {
      // #funfact - loader fallback
      vm_loader(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        undefined,
        'text',
        `cli:${send.label}`,
        send.args.join(' '),
      )
    }

    return 0
  })
  .command('send', (_, words) => {
    const send = parsesend(words, true)
    handlesend(send)
    return 0
  })
  .command('stat', (_, words) => {
    vm_makeitscroll(
      SOFTWARE,
      READ_CONTEXT.elementfocus,
      words.map(maptostring).join(' '),
    )
    return 0
  })
  .command('text', (_, words) => {
    const text = words.map(maptostring).join(' ')
    if (ispresent(READ_CONTEXT.element) && READ_CONTEXT.elementisplayer) {
      // update player element ticker
      const { user } = memoryreadflags(READ_CONTEXT.elementid)
      const withuser = isstring(user) ? user : 'player'
      // $WOBBLE $BOUNCE $SPIN
      READ_CONTEXT.element.tickertext = `${withuser}:$WHITE ${text}`
      READ_CONTEXT.element.tickertime = READ_CONTEXT.timestamp

      // log text
      const icon = bookelementdisplayread(READ_CONTEXT.element)
      api_chat(
        SOFTWARE,
        READ_CONTEXT.elementid,
        `$${COLOR[icon.color]}$ON${COLOR[icon.bg]}$${icon.char}$ONCLEAR$CYAN ${withuser}:$WHITE ${text}`,
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
  .command('hyperlink', (chip, args) => {
    const [label, ...words] = args
    const { user } = memoryreadflags(READ_CONTEXT.elementid)
    const withuser = isstring(user) ? user : 'player'
    const icon = bookelementdisplayread(READ_CONTEXT.element)
    const player = `$${COLOR[icon.color]}$ON${COLOR[icon.bg]}$${icon.char}$ONCLEAR $WHITE${withuser}$BLUE `
    const labelstr = chip.template(maptostring(label).split(' '))
    api_log(
      SOFTWARE,
      READ_CONTEXT.elementid,
      `!${chip.template(words)};${player}${labelstr}`,
    )
    return 0
  })
  // --- book & pages commands
  .command('bookrename', () => {
    if (!isoperator(READ_CONTEXT.elementfocus)) {
      return 0
    }

    const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
    bookupdatename(mainbook)
    if (ispresent(mainbook)) {
      writeoption(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        'main',
        `${mainbook?.name ?? 'empty'} $GREEN${mainbook?.id ?? ''}`,
      )
    }

    return 0
  })
  .command('bookcreate', (chip, words) => {
    if (!isoperator(READ_CONTEXT.elementfocus)) {
      return 0
    }
    const [maybename] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])

    const book = memorycreatesoftwarebook(maybename)
    if (ispresent(book)) {
      chip.command('bookopen', book.id)
    }
    return 0
  })
  .command('bookopen', (_, words) => {
    if (!isoperator(READ_CONTEXT.elementfocus)) {
      return 0
    }
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
    if (!isoperator(READ_CONTEXT.elementfocus)) {
      return 0
    }
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
    if (!isoperator(READ_CONTEXT.elementfocus)) {
      return 0
    }
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
    // update this to pull wiki content
    const text = words.map(maptostring).join(' ') || 'menu'
    chip.command(`help${text}`)
    return 0
  })
  .command('books', () => {
    if (!isoperator(READ_CONTEXT.elementfocus)) {
      return 0
    }
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
      helpprint('nopages')
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
            `!boardopen ${page.id};$blue[#goto]$white ${name}`,
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
              `!boardopen ${page.id};$blue[#goto]$white ${name}`,
            )
          })
      }
    }
    return 0
  })
  .command('trash', () => {
    if (!isoperator(READ_CONTEXT.elementfocus)) {
      return 0
    }
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
  // -- game state related commands
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
  .command('dev', () => {
    if (isoperator(READ_CONTEXT.elementfocus)) {
      vm_flush_op()
      register_dev(SOFTWARE, READ_CONTEXT.elementfocus)
    } else {
      // no-op
    }
    return 0
  })
  .command('share', () => {
    if (isoperator(READ_CONTEXT.elementfocus)) {
      vm_flush_op()
      register_share(SOFTWARE, READ_CONTEXT.elementfocus)
    } else {
      // no-op
    }
    return 0
  })
  .command('save', () => {
    if (isoperator(READ_CONTEXT.elementfocus)) {
      vm_flush_op()
    } else {
      // no-op
    }
    return 0
  })
  .command('fork', () => {
    if (isoperator(READ_CONTEXT.elementfocus)) {
      vm_fork(SOFTWARE, READ_CONTEXT.elementfocus)
    } else {
      // no-op
    }
    return 0
  })
  .command('nuke', () => {
    if (isoperator(READ_CONTEXT.elementfocus)) {
      register_nuke(SOFTWARE, READ_CONTEXT.elementfocus)
    } else {
      // no-op
    }
    return 0
  })
  .command('endgame', () => {
    vm_logout(SOFTWARE, READ_CONTEXT.elementfocus, false)
    return 0
  })
  .command('restart', () => {
    if (isoperator(READ_CONTEXT.elementfocus)) {
      vm_restart(SOFTWARE, READ_CONTEXT.elementfocus)
      vm_flush_op()
    } else {
      // no-op
    }
    return 0
  })
  // -- export content related commands
  .command('export', () => {
    if (!isoperator(READ_CONTEXT.elementfocus)) {
      return 0
    }
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
    if (!isoperator(READ_CONTEXT.elementfocus)) {
      return 0
    }
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
    if (!isoperator(READ_CONTEXT.elementfocus)) {
      return 0
    }
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
    if (!isoperator(READ_CONTEXT.elementfocus)) {
      return 0
    }
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
  .command('itchiopublish', () => {
    if (!isoperator(READ_CONTEXT.elementfocus)) {
      return 0
    }
    vm_itchiopublish(SOFTWARE, READ_CONTEXT.elementfocus)
    return 0
  })
  // -- editing related commands
  .command('gadget', () => {
    // gadget will turn on / off the built-in inspector
    register_inspector(SOFTWARE, READ_CONTEXT.elementfocus)
    return 0
  })
  .command('findany', (_, words) => {
    const [maybeselection] = readargs(words, 0, [ARG_TYPE.ANY])
    if (isarray(maybeselection)) {
      const pts = maybeselection.filter(ispt)
      register_findany(SOFTWARE, READ_CONTEXT.elementfocus, pts)
    } else {
      register_findany(SOFTWARE, READ_CONTEXT.elementfocus, [])
    }
    return 0
  })
  // -- import content related commands
  .command('zztsearch', (_, words) => {
    const [maybefield, maybetext] = readargs(words, 0, [
      ARG_TYPE.NAME,
      ARG_TYPE.MAYBE_NAME,
    ])
    const field = ispresent(maybetext) ? maybefield : 'title'
    const text = ispresent(maybetext) ? maybetext : maybefield
    vm_zztsearch(SOFTWARE, READ_CONTEXT.elementfocus, field, text)
    return 0
  })
  .command('zztrandom', () => {
    vm_zztrandom(SOFTWARE, READ_CONTEXT.elementfocus)
    return 0
  })
  // -- multiplayer related commands
  .command('admin', () => {
    vm_admin(SOFTWARE, READ_CONTEXT.elementfocus)
    return 0
  })
  .command('joincode', (_, words) => {
    if (!isoperator(READ_CONTEXT.elementfocus)) {
      return 0
    }
    const [maybehidden] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
    const playerboard = memoryreadplayerboard(READ_CONTEXT.elementfocus)
    if (ispresent(playerboard)) {
      bridge_start(SOFTWARE, READ_CONTEXT.elementfocus, !!maybehidden)
    } else {
      api_error(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        'multiplayer',
        'need to have an active player on a board in order to start multiplayer',
      )
    }
    return 0
  })
  .command('jointab', (_, words) => {
    if (!isoperator(READ_CONTEXT.elementfocus)) {
      return 0
    }
    const [maybehidden] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
    bridge_tab(SOFTWARE, READ_CONTEXT.elementfocus, !!maybehidden)
    return 0
  })
  // -- audience related commands
  .command('chat', (_, words) => {
    if (!isoperator(READ_CONTEXT.elementfocus)) {
      return 0
    }
    const [channel] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
    if (channel) {
      bridge_chatstart(SOFTWARE, READ_CONTEXT.elementfocus, channel)
    } else {
      bridge_chatstop(SOFTWARE, READ_CONTEXT.elementfocus)
    }
    return 0
  })
  .command('broadcast', (_, words) => {
    if (!isoperator(READ_CONTEXT.elementfocus)) {
      return 0
    }
    const [streamkey] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
    if (streamkey) {
      bridge_streamstart(SOFTWARE, READ_CONTEXT.elementfocus, streamkey)
    } else {
      bridge_streamstop(SOFTWARE, READ_CONTEXT.elementfocus)
    }
    return 0
  })
