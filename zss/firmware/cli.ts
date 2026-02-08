import { parsetarget } from 'zss/device'
import {
  apierror,
  apilog,
  bridgechatstart,
  bridgechatstop,
  bridgestart,
  bridgestreamstart,
  bridgestreamstop,
  bridgetab,
  registerdownloadjsonfile,
  registereditoropen,
  registerfindany,
  registerinspector,
  registernuke,
  registerscreenshot,
  registershare,
  vmadmin,
  vmagentlist,
  vmagentprompt,
  vmagentstart,
  vmagentstop,
  vmcodeaddress,
  vmflush,
  vmfork,
  vmhalt,
  vmloader,
  vmlogout,
  vmmakeitscroll,
  vmpublish,
  vmrefscroll,
  vmrestart,
  vmzztrandom,
  vmzztsearch,
} from 'zss/device/api'
import { modemwriteinitstring } from 'zss/device/modem'
import { SOFTWARE } from 'zss/device/session'
import { romparse, romprint, romread } from 'zss/feature/rom'
import { bbsdelete, bbslist, bbslogin, bbslogincode } from 'zss/feature/url'
import {
  write,
  writebbar,
  writeheader,
  writeopenit,
  writeoption,
  writesection,
  writetext,
} from 'zss/feature/writeui'
import { createfirmware } from 'zss/firmware'
import { doasync } from 'zss/mapping/func'
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
  memoryclearbook,
  memoryensuresoftwarebook,
  memoryreadboardbyaddress,
  memoryreadbookbyaddress,
  memoryreadbookbysoftware,
  memoryreadbooklist,
  memoryreadflags,
  memoryreadoperator,
  memorywritesoftwarebook,
} from 'zss/memory'
import {
  memoryclearbookcodepage,
  memorylistcodepagessorted,
  memoryreadcodepage,
  memoryreadelementdisplay,
  memoryupdatebookname,
} from 'zss/memory/bookoperations'
import {
  memoryreadcodepagename,
  memoryreadcodepagetype,
  memoryreadcodepagetypeasstring,
} from 'zss/memory/codepageoperations'
import { memorysendtoelements, memorysendtolog } from 'zss/memory/gamesend'
import {
  memorymoveplayertoboard,
  memoryreadplayerboard,
} from 'zss/memory/playermanagement'
import { memorycodepagetoprefix } from 'zss/memory/rendering'
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BOOK,
  CODE_PAGE,
  CODE_PAGE_TYPE,
  MEMORY_LABEL,
} from 'zss/memory/types'
import { ispt } from 'zss/words/dir'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'
import { parsesend } from 'zss/words/send'
import { COLOR, NAME } from 'zss/words/types'

let bbscode = ''
let bbsemail = ''

function isemail(email: string) {
  return /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.exec(
    String(email).toLowerCase(),
  )
}

function isoperator(player: string) {
  return player === memoryreadoperator()
}

function vmflushop() {
  vmflush(SOFTWARE, memoryreadoperator())
}

export const CLI_FIRMWARE = createfirmware()
  .command('shortsend', (chip, words) => {
    const send = parsesend(words)
    // #funfact - loader fallback
    if (send.targetname === 'self') {
      vmloader(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        undefined,
        'text',
        `cli:${send.label}`,
        send.args.join(' '),
      )
    } else {
      memorysendtoelements(chip, READ_CONTEXT.element, send)
    }
    return 0
  })
  .command('send', (chip, words) => {
    const send = parsesend(words, true)
    memorysendtoelements(chip, READ_CONTEXT.element, send)
    return 0
  })
  .command('stat', (_, words) => {
    vmmakeitscroll(
      SOFTWARE,
      READ_CONTEXT.elementfocus,
      words.map(maptostring).join(' '),
    )
    return 0
  })
  .command('text', (_, words) => {
    const ticker = words.map(maptostring).join(' ')
    if (ispresent(READ_CONTEXT.element) && READ_CONTEXT.elementisplayer) {
      // update player element ticker
      READ_CONTEXT.element.tickertext = ticker
      READ_CONTEXT.element.tickertime = READ_CONTEXT.timestamp
      // log text
      memorysendtolog('', READ_CONTEXT.element, ticker)
      // raise event
      const { user } = memoryreadflags(READ_CONTEXT.elementid)
      const withuser = isstring(user) ? user : 'player'
      vmloader(
        SOFTWARE,
        READ_CONTEXT.elementid,
        undefined,
        'text',
        `chat:message:${READ_CONTEXT.board?.id ?? ''}`,
        `${withuser}:${ticker}`,
      )
    }
    return 0
  })
  .command('hyperlink', (chip, args) => {
    const [label, ...words] = args
    const { user } = memoryreadflags(READ_CONTEXT.elementid)
    const withuser = isstring(user) ? user : 'player'
    const icon = memoryreadelementdisplay(READ_CONTEXT.element)
    const player = `$${COLOR[icon.color]}$ON${COLOR[icon.bg]}$${icon.char}$ONCLEAR $WHITE${withuser}$BLUE `
    const labelstr = chip.template(maptostring(label).split(' '))
    apilog(
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
    memoryupdatebookname(mainbook)
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
        memorywritesoftwarebook(MEMORY_LABEL.MAIN, '')
      }
      // clear book
      memoryclearbook(address)
      apilog(SOFTWARE, READ_CONTEXT.elementfocus, `trashed [book] ${book.name}`)
      vmflushop()
      // reset to good state
      chip.command('pages')
    }
    return 0
  })
  .command('boardopen', (_, words) => {
    const [stat] = readargs(words, 0, [ARG_TYPE.NAME])
    const target = memoryreadboardbyaddress(stat)
    if (ispresent(target)) {
      memorymoveplayertoboard(
        READ_CONTEXT.book,
        READ_CONTEXT.elementfocus,
        target.id,
        {
          x: randominteger(0, BOARD_WIDTH - 1),
          y: randominteger(0, BOARD_HEIGHT - 1),
        },
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
      codepage = memoryreadcodepage(codepagebook, page)
      if (ispresent(codepage)) {
        break
      }
    }

    if (ispresent(codepage) && ispresent(codepagebook)) {
      const name = memoryreadcodepagename(codepage)

      // path
      const path = [codepage.id, maybeobject]

      // write to modem
      modemwriteinitstring(vmcodeaddress(codepagebook.id, path), codepage.code)

      // tell tape to open a code editor for given page
      const type = memoryreadcodepagetypeasstring(codepage)

      // codepage details
      const title = `${memorycodepagetoprefix(codepage)}$ONCLEAR$GREEN ${name} - ${codepagebook.name}`
      registereditoropen(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        codepagebook.id,
        path,
        type,
        title,
      )
    } else {
      apierror(
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
    const codepage = memoryclearbookcodepage(mainbook, page)
    if (ispresent(page)) {
      const name = memoryreadcodepagename(codepage)
      const pagetype = memoryreadcodepagetypeasstring(codepage)
      apilog(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        `trashed [${pagetype}] ${name}`,
      )
      vmflushop()
      chip.command('pages')
    }

    return 0
  })
  .command('help', () => {
    vmrefscroll(SOFTWARE, READ_CONTEXT.elementfocus)
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
      const sorted = memorylistcodepagessorted(mainbook)
      sorted.forEach((page) => {
        const name = memoryreadcodepagename(page)
        const type = memoryreadcodepagetypeasstring(page)
        const prefix = memorycodepagetoprefix(page)
        write(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `!pageopen ${page.id};$blue[${type}] ${prefix}$white${name}`,
        )
      })
    } else {
      write(SOFTWARE, READ_CONTEXT.elementfocus, ``)
      romparse(romread(`help:nopages`), (line) =>
        romprint(READ_CONTEXT.elementfocus, line),
      )
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
        const sorted = memorylistcodepagessorted(book)
        sorted.forEach((page) => {
          const name = memoryreadcodepagename(page)
          const type = memoryreadcodepagetypeasstring(page)
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
      const sorted = memorylistcodepagessorted(mainbook)
      sorted
        .filter((page) => memoryreadcodepagetype(page) === CODE_PAGE_TYPE.BOARD)
        .forEach((page) => {
          const name = memoryreadcodepagename(page)
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
        const sorted = memorylistcodepagessorted(book)
        sorted
          .filter(
            (page) => memoryreadcodepagetype(page) === CODE_PAGE_TYPE.BOARD,
          )
          .forEach((page) => {
            const name = memoryreadcodepagename(page)
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
        const name = memoryreadcodepagename(page)
        const type = memoryreadcodepagetypeasstring(page)
        const prefix = memorycodepagetoprefix(page)
        write(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `!pagetrash ${page.id};$REDTRASH [${type}] ${prefix}${name}`,
        )
      })
      write(SOFTWARE, READ_CONTEXT.elementfocus, '')
    }
    return 0
  })
  // -- game state related commands
  .command('dev', () => {
    if (isoperator(READ_CONTEXT.elementfocus)) {
      vmflushop()
      vmhalt(SOFTWARE, READ_CONTEXT.elementfocus)
    } else {
      // no-op
    }
    return 0
  })
  .command('share', () => {
    if (isoperator(READ_CONTEXT.elementfocus)) {
      vmflushop()
      registershare(SOFTWARE, READ_CONTEXT.elementfocus)
    } else {
      // no-op
    }
    return 0
  })
  .command('save', () => {
    if (isoperator(READ_CONTEXT.elementfocus)) {
      vmflushop()
    } else {
      // no-op
    }
    return 0
  })
  .command('fork', (_, words) => {
    if (isoperator(READ_CONTEXT.elementfocus)) {
      const [address] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
      vmfork(SOFTWARE, READ_CONTEXT.elementfocus, address ?? '')
    } else {
      // no-op
    }
    return 0
  })
  .command('nuke', () => {
    if (isoperator(READ_CONTEXT.elementfocus)) {
      registernuke(SOFTWARE, READ_CONTEXT.elementfocus)
    } else {
      // no-op
    }
    return 0
  })
  .command('endgame', () => {
    vmlogout(SOFTWARE, READ_CONTEXT.elementfocus, false)
    return 0
  })
  .command('restart', () => {
    if (isoperator(READ_CONTEXT.elementfocus)) {
      vmrestart(SOFTWARE, READ_CONTEXT.elementfocus)
      vmflushop()
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
          const sorted = memorylistcodepagessorted(book)
          write(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            `!bookallexport ${address};$blue[all] $whiteexport book`,
          )
          sorted.forEach((page) => {
            const name = memoryreadcodepagename(page)
            const type = memoryreadcodepagetypeasstring(page)
            const prefix = memorycodepagetoprefix(page)
            write(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              `!pageexport ${address}:${page.id};$blue[${type}] ${prefix}$white${name}`,
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
      registerdownloadjsonfile(
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
    const codepage = memoryreadcodepage(book, path)
    if (ispresent(codepage)) {
      registerdownloadjsonfile(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        deepcopy(codepage),
        `${memoryreadcodepagename(codepage)}.${memoryreadcodepagetypeasstring(codepage)}.json`,
      )
    }
    return 0
  })
  .command('itchiopublish', () => {
    if (!isoperator(READ_CONTEXT.elementfocus)) {
      return 0
    }
    const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    vmpublish(
      SOFTWARE,
      READ_CONTEXT.elementfocus,
      'itchio',
      mainbook?.name ?? '',
    )
    return 0
  })
  // -- editing related commands
  .command('gadget', () => {
    // gadget will turn on / off the built-in inspector
    registerinspector(SOFTWARE, READ_CONTEXT.elementfocus, undefined)
    return 0
  })
  .command('findany', (_, words) => {
    const [maybeselection] = readargs(words, 0, [ARG_TYPE.ANY])
    if (isarray(maybeselection)) {
      const pts = maybeselection.filter(ispt)
      registerfindany(SOFTWARE, READ_CONTEXT.elementfocus, pts)
    } else {
      registerfindany(SOFTWARE, READ_CONTEXT.elementfocus, [])
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
    vmzztsearch(SOFTWARE, READ_CONTEXT.elementfocus, field, text)
    return 0
  })
  .command('zztrandom', () => {
    vmzztrandom(SOFTWARE, READ_CONTEXT.elementfocus)
    return 0
  })
  // -- multiplayer related commands
  .command('admin', () => {
    vmadmin(SOFTWARE, READ_CONTEXT.elementfocus)
    return 0
  })
  .command('joincode', (_, words) => {
    if (!isoperator(READ_CONTEXT.elementfocus)) {
      return 0
    }
    const [maybehidden] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
    const playerboard = memoryreadplayerboard(READ_CONTEXT.elementfocus)
    if (ispresent(playerboard)) {
      bridgestart(SOFTWARE, READ_CONTEXT.elementfocus, !!maybehidden)
    } else {
      apierror(
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
    bridgetab(SOFTWARE, READ_CONTEXT.elementfocus, !!maybehidden)
    return 0
  })
  // -- audience related commands
  .command('chat', (_, words) => {
    if (!isoperator(READ_CONTEXT.elementfocus)) {
      return 0
    }
    const [channel] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
    if (channel) {
      bridgechatstart(SOFTWARE, READ_CONTEXT.elementfocus, channel)
    } else {
      bridgechatstop(SOFTWARE, READ_CONTEXT.elementfocus)
    }
    return 0
  })
  .command('broadcast', (_, words) => {
    if (!isoperator(READ_CONTEXT.elementfocus)) {
      return 0
    }
    const [streamkey] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
    if (streamkey) {
      bridgestreamstart(SOFTWARE, READ_CONTEXT.elementfocus, streamkey)
    } else {
      bridgestreamstop(SOFTWARE, READ_CONTEXT.elementfocus)
    }
    return 0
  })
  .command('agent', (_, words) => {
    const [action, ii] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
    switch (NAME(action)) {
      case 'start':
        vmagentstart(SOFTWARE, READ_CONTEXT.elementfocus)
        break
      case 'stop': {
        const [agentid] = readargs(words, 1, [ARG_TYPE.NAME])
        if (ispresent(agentid)) {
          vmagentstop(SOFTWARE, READ_CONTEXT.elementfocus, agentid)
        } else {
          apierror(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            'agent',
            '#agent stop <id>',
          )
        }
        break
      }
      case '':
      case 'list':
        vmagentlist(SOFTWARE, READ_CONTEXT.elementfocus)
        break
      default: {
        if (isstring(action)) {
          let iii = ii
          const values: any[] = []
          while (iii < words.length) {
            const [value, iiii] = readargs(words, iii, [ARG_TYPE.ANY])
            values.push(value)
            iii = iiii
          }
          vmagentprompt(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            action,
            values.map(maptostring).join(' '),
          )
        } else {
          apierror(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            'agent',
            '#agent <id> <prompt>',
          )
        }
        break
      }
    }
    return 0
  })
  .command('screenshot', () => {
    registerscreenshot(SOFTWARE, READ_CONTEXT.elementfocus)
    return 0
  })
  .command('bbs', (_, words) => {
    const [action, ii] = readargs(words, 0, [ARG_TYPE.ANY])
    switch (NAME(action)) {
      default:
        // login logic
        if (!bbsemail) {
          const [maybeemail, maybetag] = readargs(words, 0, [
            ARG_TYPE.NAME,
            ARG_TYPE.NAME,
          ])
          if (isemail(maybeemail) && maybetag) {
            doasync(SOFTWARE, READ_CONTEXT.elementfocus, async () => {
              writetext(
                SOFTWARE,
                READ_CONTEXT.elementfocus,
                `starting login with $green${maybeemail} ${maybetag}`,
              )
              const result = await bbslogin(maybeemail, maybetag)
              if (result.success) {
                bbsemail = maybeemail
                writetext(
                  SOFTWARE,
                  READ_CONTEXT.elementfocus,
                  `check your email for #bbs <code>`,
                )
              }
            })
          } else {
            writetext(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              `please login with $green#bbs <email> <tag>`,
            )
          }
        } else if (!bbscode) {
          doasync(SOFTWARE, READ_CONTEXT.elementfocus, async () => {
            writetext(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              `confirming login with $green${action}`,
            )
            const result = await bbslogincode(bbsemail, action)
            if (result.success) {
              bbscode = `${action}`
              writetext(
                SOFTWARE,
                READ_CONTEXT.elementfocus,
                `$green${bbsemail} has been logged in`,
              )
            }
          })
        } else {
          // we're logged in
          writetext(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            `you are already logged in, use #bbs restart to login again`,
          )
        }
        break
      case 'restart':
        bbsemail = ''
        bbscode = ''
        writetext(SOFTWARE, READ_CONTEXT.elementfocus, `bbs restarted`)
        writetext(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `please login with $green#bbs <email> <tag>`,
        )
        break
      case 'list':
        if (!bbsemail || !bbscode) {
          writetext(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            `please login with $green#bbs <email> <tag>$blue first`,
          )
        } else {
          doasync(SOFTWARE, READ_CONTEXT.elementfocus, async () => {
            writetext(SOFTWARE, READ_CONTEXT.elementfocus, `listing files`)
            const result = await bbslist(bbsemail, bbscode)
            if (result.success) {
              for (let i = 0; i < result.list.length; ++i) {
                const { metadata } = result.list[i]
                writeopenit(
                  SOFTWARE,
                  READ_CONTEXT.elementfocus,
                  metadata.url,
                  metadata.filename,
                )
                writetext(SOFTWARE, READ_CONTEXT.elementfocus, metadata.tags)
              }
            }
          })
        }
        break
      case 'pub':
      case 'publish':
        if (!bbsemail || !bbscode) {
          writetext(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            `please login with $green#bbs <email> <tag>$blue first`,
          )
        } else {
          const [filename, iii] = readargs(words, ii, [ARG_TYPE.NAME])
          const tags: string[] = []
          for (let iiii = iii; iiii < words.length; ) {
            const [tag, iiiii] = readargs(words, iiii, [ARG_TYPE.NAME])
            iiii = iiiii
            tags.push(tag)
          }
          vmpublish(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            'bbs',
            bbsemail,
            bbscode,
            filename,
            ...tags,
          )
        }
        break
      case 'del':
      case 'delete':
        if (!bbsemail || !bbscode) {
          writetext(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            `please login with $green#bbs <email> <tag>$blue first`,
          )
        } else {
          const [filename] = readargs(words, ii, [ARG_TYPE.NAME])
          doasync(SOFTWARE, READ_CONTEXT.elementfocus, async () => {
            writetext(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              `deleting ${filename}`,
            )
            const result = await bbsdelete(bbsemail, bbscode, filename)
            if (result.success) {
              writetext(
                SOFTWARE,
                READ_CONTEXT.elementfocus,
                `$red${filename} has been deleted`,
              )
            }
          })
        }
        break
    }
    return 0
  })
