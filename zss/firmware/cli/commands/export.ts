import { parsetarget } from 'zss/device'
import {
  registerdownloadbinaryfile,
  registerdownloadjsonfile,
  vmpublish,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { exportbooktozzt } from 'zss/feature/parse/zztexport'
import { write, writeheader, writesection } from 'zss/feature/writeui'
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
    .command(
      'bookexport',
      [ARG_TYPE.NAME, 'book export options (operator only)'],
      (_, words) => {
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
              write(
                SOFTWARE,
                READ_CONTEXT.elementfocus,
                `!bookzztexport ${address};$magenta[zzt] $whiteexport ZZT world`,
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
            for (let i = 0; i < zztresult.errors.length; ++i) {
              write(
                SOFTWARE,
                READ_CONTEXT.elementfocus,
                `$red${zztresult.errors[i].message}`,
              )
            }
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
