import { parsetarget } from 'zss/device'
import {
  registerdownloadbinaryfile,
  registerdownloadjsonfile,
  vmpublish,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { exportbooktozzt } from 'zss/feature/parse/zztexport'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import {
  zssheaderlines,
  zsssectionlines,
  zsstexttape,
} from 'zss/feature/zsstextui'
import { FIRMWARE } from 'zss/firmware'
import { deepcopy, ispresent } from 'zss/mapping/types'
import {
  memorylistcodepagessorted,
  memoryreadcodepage,
} from 'zss/memory/bookoperations'
import {
  memoryreadcodepagename,
  memoryreadcodepagetypeasstring,
} from 'zss/memory/codepageoperations'
import { memorycodepagetoprefix } from 'zss/memory/rendering'
import {
  memoryreadbookbyaddress,
  memoryreadbookbysoftware,
  memoryreadbooklist,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE } from 'zss/words/types'

export function registerexportcommands(fw: FIRMWARE): FIRMWARE {
  return fw
    .command('export', ['export menu (operator only)'], () => {
      const list = memoryreadbooklist()
      const booklinks = list.map(
        (book) => `!bookexport ${book.id};${book.name}`,
      )
      terminalwritelines(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        zsstexttape(
          zssheaderlines(`E X P O R T`),
          zsssectionlines(`books`),
          ...(booklinks.length > 0 ? booklinks : []),
        ),
      )
      return 0
    })
    .command(
      'bookexport',
      [ARG_TYPE.NAME, 'book export options (operator only)'],
      (_, words) => {
        const [address] = readargs(words, 0, [ARG_TYPE.NAME])
        const book = memoryreadbookbyaddress(address)
        if (ispresent(book)) {
          terminalwritelines(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            zsstexttape(
              zssheaderlines(`E X P O R T`),
              zsssectionlines(`pages`),
            ),
          )
          setTimeout(() => {
            if (book.pages.length) {
              const sorted = memorylistcodepagessorted(book)
              const pagelines = sorted.map((page) => {
                const name = memoryreadcodepagename(page)
                const type = memoryreadcodepagetypeasstring(page)
                const prefix = memorycodepagetoprefix(page)
                return `!pageexport ${address}:${page.id};$blue[${type}] ${prefix}$white${name}`
              })
              terminalwritelines(
                SOFTWARE,
                READ_CONTEXT.elementfocus,
                zsstexttape(
                  `!bookallexport ${address};$blue[all] $whiteexport book`,
                  `!bookzztexport ${address};$magenta[zzt] $whiteexport ZZT world`,
                  pagelines,
                ),
              )
            }
          }, 1000)
        }
        return 0
      },
    )
    .command(
      'bookallexport',
      [ARG_TYPE.NAME, 'entire book as JSON (operator only)'],
      (_, words) => {
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
      },
    )
    .command(
      'bookzztexport',
      [ARG_TYPE.NAME, 'entire book as .zzt world (operator only)'],
      (_, words) => {
        const [address] = readargs(words, 0, [ARG_TYPE.NAME])
        const book = memoryreadbookbyaddress(address)
        if (ispresent(book)) {
          const zztresult = exportbooktozzt(book)
          if (zztresult.ok) {
            const safefilename = `${book.name.replace(/[^\w.-]+/g, '_') || 'world'}.zzt`
            registerdownloadbinaryfile(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              zztresult.bytes,
              safefilename,
              'application/octet-stream',
            )
          } else {
            const errlines = zztresult.errors.map((e) => `$red${e.message}`)
            terminalwritelines(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              zsstexttape(errlines),
            )
          }
        }
        return 0
      },
    )
    .command(
      'pageexport',
      [ARG_TYPE.NAME, 'code page as JSON (operator only)'],
      (_, words) => {
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
      },
    )
    .command('itchiopublish', ['zip file for itch.io (operator only)'], () => {
      const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
      vmpublish(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        'itchio',
        mainbook?.name ?? '',
      )
      return 0
    })
}
