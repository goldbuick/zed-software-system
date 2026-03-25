import {
  apierror,
  apilog,
  registereditoropen,
  vmcodeaddress,
  vmrefscroll,
} from 'zss/device/api'
import { modemwriteinitstring } from 'zss/device/modem'
import { SOFTWARE } from 'zss/device/session'
import { parsemarkdownforwriteui } from 'zss/feature/parse/markdownwriteui'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import {
  write,
  writebbar,
  writeoption,
  writesection,
  writetext,
} from 'zss/feature/writeui'
import { FIRMWARE } from 'zss/firmware'
import { codepagepicksuffix, vmflushop } from 'zss/firmware/cli/utils'
import { randominteger } from 'zss/mapping/number'
import { MAYBE, isnumber, ispresent, isstring } from 'zss/mapping/types'
import { memoryreadobject } from 'zss/memory/boardoperations'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import {
  memoryclearbookcodepage,
  memorylistcodepagessorted,
  memoryreadcodepage,
  memoryupdatebookname,
} from 'zss/memory/bookoperations'
import { memoryensuresoftwarebook } from 'zss/memory/books'
import {
  memoryreadcodepagedata,
  memoryreadcodepagename,
  memoryreadcodepagetype,
  memoryreadcodepagetypeasstring,
} from 'zss/memory/codepageoperations'
import { memorymoveplayertoboard } from 'zss/memory/playermanagement'
import {
  memorycodepagetoprefix,
  memoryelementtodisplayprefix,
} from 'zss/memory/rendering'
import {
  memoryclearbook,
  memoryreadbookbyaddress,
  memoryreadbookbysoftware,
  memoryreadbooklist,
  memorywritesoftwarebook,
} from 'zss/memory/session'
import {
  BOARD_ELEMENT,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BOOK,
  CODE_PAGE,
  CODE_PAGE_TYPE,
  MEMORY_LABEL,
} from 'zss/memory/types'
import { romread } from 'zss/rom'
import { READ_CONTEXT, readargs, readargsuntilend } from 'zss/words/reader'
import { ARG_TYPE } from 'zss/words/types'

export function registerbookscommands(fw: FIRMWARE): FIRMWARE {
  return fw
    .command('bookrename', ['the main book (operator only)'], () => {
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
    .command(
      'booktrash',
      [ARG_TYPE.NAME, 'a book by address (operator only)'],
      (chip, words) => {
        const [address] = readargs(words, 0, [ARG_TYPE.NAME])
        const opened = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
        const book = memoryreadbookbyaddress(address)
        if (ispresent(book)) {
          if (opened === book) {
            memorywritesoftwarebook(MEMORY_LABEL.MAIN, '')
          }
          memoryclearbook(address)
          apilog(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            `trashed [book] ${book.name}`,
          )
          vmflushop()
          chip.command('pages')
        }
        return 0
      },
    )
    .command(
      'boardopen',
      [ARG_TYPE.NAME, 'to move player to board'],
      (_, words) => {
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
      },
    )
    .command(
      'pageopen',
      [
        ARG_TYPE.NAME,
        ARG_TYPE.MAYBE_NUMBER_OR_NAME,
        ARG_TYPE.MAYBE_NUMBER_OR_NAME,
        'a code page editor',
      ],
      (_, words) => {
        const [page, arg1, arg2] = readargs(words, 0, [
          ARG_TYPE.NAME,
          ARG_TYPE.MAYBE_NUMBER_OR_NAME,
          ARG_TYPE.MAYBE_NUMBER_OR_NAME,
        ])
        const maybescrollto = arg2 ?? arg1
        const maybeobject = isstring(arg1) ? arg1 : undefined

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
          const path = [codepage.id, maybeobject]

          let type = memoryreadcodepagetypeasstring(codepage)

          // read the element if it's an object
          let element: MAYBE<BOARD_ELEMENT> = undefined
          if (ispresent(maybeobject) && type === 'board') {
            const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(codepage)
            element = memoryreadobject(board, maybeobject)
            if (ispresent(element)) {
              type = 'object'
            }
          }

          // config values
          const code = ispresent(element) ? (element.code ?? '') : codepage.code

          // write to modem
          modemwriteinitstring(vmcodeaddress(codepagebook.id, path), code)

          // open the editor
          const title = ispresent(element)
            ? `${memoryelementtodisplayprefix(element)}$ONCLEAR$GREEN ${element.name ?? element.kind ?? '??'} - ${codepagebook.name}`
            : `${memorycodepagetoprefix(codepage)}$ONCLEAR$GREEN ${name} - ${codepagebook.name}`
          const scrollline = isnumber(maybescrollto) ? maybescrollto : 0

          registereditoropen(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            codepagebook.id,
            path,
            type,
            title,
            scrollline,
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
      },
    )
    .command(
      'pagetrash',
      [ARG_TYPE.NAME, 'a code page (operator only)'],
      (chip, words) => {
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
      },
    )
    .command('help', ['help scroll'], () => {
      vmrefscroll(SOFTWARE, READ_CONTEXT.elementfocus)
      return 0
    })
    .command('books', ['all books'], () => {
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
      write(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        `!bookcreate;create a new book`,
      )
      return 0
    })
    .command('pages', ['all pages in all loaded books'], () => {
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
        // Batch `!pageopen …;…` rows only; framing stays imperative above.
        const pagerows: string[] = []
        for (let pi = 0; pi < sorted.length; ++pi) {
          const page = sorted[pi]
          const name = memoryreadcodepagename(page)
          const type = memoryreadcodepagetypeasstring(page)
          const prefix = memorycodepagetoprefix(page)
          pagerows.push(
            `!pageopen ${page.id};$blue[${type}] ${prefix}$white${name}${codepagepicksuffix(page)}`,
          )
        }
        terminalwritelines(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          pagerows.join('\n'),
        )
      } else {
        write(SOFTWARE, READ_CONTEXT.elementfocus, ``)
        parsemarkdownforwriteui(
          READ_CONTEXT.elementfocus,
          romread(`help:nopages`) ?? '',
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
          // Batch `!pageopen …;…` rows only.
          const pagerows: string[] = []
          for (let pi = 0; pi < sorted.length; ++pi) {
            const page = sorted[pi]
            const name = memoryreadcodepagename(page)
            const type = memoryreadcodepagetypeasstring(page)
            const prefix = memorycodepagetoprefix(page)
            pagerows.push(
              `!pageopen ${page.id};$blue[${type}] ${prefix}$white${name}${codepagepicksuffix(page)}`,
            )
          }
          terminalwritelines(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            pagerows.join('\n'),
          )
        }
      }
      return 0
    })
    .command(
      'search',
      [ARG_TYPE.NAME, 'codepage code for query'],
      (_, words) => {
        const [querywords] = readargsuntilend(words, 0, ARG_TYPE.NAME)
        const q = querywords.join(' ')
        writesection(SOFTWARE, READ_CONTEXT.elementfocus, `search: ${q}`)
        const booklist = memoryreadbooklist()
        let count = 0
        // Batch only `!payload;label` tape rows via terminalwritelines; keep writesection / writetext imperative.
        for (let i = 0; i < booklist.length; ++i) {
          const book = booklist[i]
          const sorted = memorylistcodepagessorted(book)
          const matchrows: string[] = []
          for (let p = 0; p < sorted.length; ++p) {
            const page = sorted[p]
            const code = page.code ?? ''
            const name = memoryreadcodepagename(page)
            const type = memoryreadcodepagetypeasstring(page)
            const prefix = memorycodepagetoprefix(page)
            const lines = code.split('\n')
            for (let ln = 0; ln < lines.length; ++ln) {
              const line = lines[ln]
              if (line.includes(q)) {
                const lineNum = ln + 1
                const snippet = line.trim().slice(0, 60)
                const label = [
                  `$blue[${type}] ${prefix}$white`,
                  `${name}:${lineNum}$GREEN`,
                  `${snippet}${snippet.length >= line.trim().length ? '' : '...'}`,
                ].join(' ')
                matchrows.push(`!pageopen ${page.id} ${ln};${label}`)
                count++
              }
            }
          }
          if (matchrows.length) {
            terminalwritelines(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              matchrows.join('\n'),
            )
          }
        }
        for (let i = 0; i < booklist.length; ++i) {
          const book = booklist[i]
          const sorted = memorylistcodepagessorted(book)
          const boardpages = sorted.filter(
            (page: CODE_PAGE) =>
              memoryreadcodepagetype(page) === CODE_PAGE_TYPE.BOARD,
          )
          for (let b = 0; b < boardpages.length; ++b) {
            const boardpage = boardpages[b]
            const board = memoryreadboardbyaddress(boardpage.id)
            if (!ispresent(board) || !ispresent(board.objects)) {
              continue
            }
            const boardname = memoryreadcodepagename(boardpage)
            const objects = Object.values(board.objects)
            const objectmatches: string[] = []
            for (let o = 0; o < objects.length; ++o) {
              const object = objects[o]
              const code = object.code ?? ''
              if (!code) {
                continue
              }
              const lines = code.split('\n')
              for (let ln = 0; ln < lines.length; ++ln) {
                const line = lines[ln]
                if (line.includes(q)) {
                  const lineNum = ln + 1
                  const snippet = line.trim().slice(0, 60)
                  const objid = object.id ?? ''
                  const objlabel = object.name ?? object.kind ?? objid
                  const label = [
                    `$blue[board]$white`,
                    boardname,
                    `$blue[object]$white`,
                    memoryelementtodisplayprefix(object),
                    `${objlabel}:${lineNum}$GREEN`,
                    `${snippet}${snippet.length >= line.trim().length ? '' : '...'}`,
                  ].join(' ')
                  objectmatches.push(
                    `!pageopen ${boardpage.id} ${objid} ${ln};${label}`,
                  )
                  count++
                }
              }
            }
            if (objectmatches.length) {
              write(
                SOFTWARE,
                READ_CONTEXT.elementfocus,
                `!boardopen ${boardpage.id};$blue[#goto]$white ${boardname}`,
              )
              terminalwritelines(
                SOFTWARE,
                READ_CONTEXT.elementfocus,
                objectmatches.join('\n'),
              )
            }
          }
        }
        if (count === 0) {
          writetext(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            `$white no matches for "${q}"`,
          )
        }
        return 0
      },
    )
    .command('boards', ['all boards as goto hyperlinks'], () => {
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
        // Batch `!boardopen …;…` rows only.
        const mainboardrows: string[] = []
        for (let bi = 0; bi < sorted.length; ++bi) {
          const page = sorted[bi]
          if (memoryreadcodepagetype(page) === CODE_PAGE_TYPE.BOARD) {
            const name = memoryreadcodepagename(page)
            mainboardrows.push(
              `!boardopen ${page.id};$blue[#goto]$white ${name}`,
            )
          }
        }
        if (mainboardrows.length) {
          terminalwritelines(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            mainboardrows.join('\n'),
          )
        }
        if (sorted.length === 0) {
          write(SOFTWARE, READ_CONTEXT.elementfocus, ``)
          writetext(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            `$white no boards found`,
          )
          writetext(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            `$white use @board name to create a board`,
          )
        }
      }
      const booklist = memoryreadbooklist()
      for (let i = 0; i < booklist.length; ++i) {
        const book = booklist[i]
        if (book.id !== mainbook?.id) {
          writeoption(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            'content',
            `${book.name} $GREEN${book.id}`,
          )
          const sorted = memorylistcodepagessorted(book)
          // Batch `!boardopen …;…` rows only.
          const boardrows: string[] = []
          for (let bi = 0; bi < sorted.length; ++bi) {
            const page = sorted[bi]
            if (memoryreadcodepagetype(page) === CODE_PAGE_TYPE.BOARD) {
              const name = memoryreadcodepagename(page)
              boardrows.push(
                `!boardopen ${page.id};$blue[#goto]$white ${name}`,
              )
            }
          }
          if (boardrows.length) {
            terminalwritelines(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              boardrows.join('\n'),
            )
          }
        }
      }
      return 0
    })
    .command('trash', ['books/codepages to delete (operator only)'], () => {
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
}
