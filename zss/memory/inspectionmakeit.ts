import { vmcli, vmplayermovetoboard } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { write } from 'zss/feature/writeui'
import { zsstexttape, zsszedlinkline } from 'zss/feature/zsstextui'
import { registerhyperlinksharedbridge } from 'zss/gadget/data/api'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { escapedoublequoted } from 'zss/mapping/string'
import { MAYBE, isnumber, ispresent, isstring } from 'zss/mapping/types'
import { statformat, stattypestring } from 'zss/words/stats'
import { NAME, STAT_TYPE } from 'zss/words/types'

import {
  memoryensurecodepage,
  memorylistcodepage,
  memoryreadcodepage,
} from './bookoperations'
import {
  memoryreadcodepagename,
  memoryreadcodepagetype,
  memoryreadcodepagetypeasstring,
} from './codepageoperations'
import { memorycreateinspectionconfig } from './inspectionconfig'
import {
  memoryreadbookbyaddress,
  memoryreadbooklist,
  memoryreadfirstbook,
  memoryreadmainbook,
} from './session'
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BOOK,
  CODE_PAGE,
  CODE_PAGE_TYPE,
} from './types'

type MAKEIT_CONFIG = {
  bookid: string
}

const makeitconfig = memorycreateinspectionconfig<MAKEIT_CONFIG>(
  'makeitconfig',
  {
    bookid: '',
  },
)

/** Index into memoryreadbooklist for the makeit book SELECT (last pick, else main). */
export function makeitbookselectindex(): number {
  const books = memoryreadbooklist()
  if (books.length === 0) {
    return 0
  }
  const bookid = makeitconfig.memoryread().bookid
  if (bookid) {
    const idx = books.findIndex((b) => b.id === bookid)
    if (idx >= 0) {
      return idx
    }
  }
  const main = memoryreadmainbook()
  if (ispresent(main)) {
    const idx = books.findIndex((b) => b.id === main.id)
    if (idx >= 0) {
      return idx
    }
  }
  return 0
}

/** Book used when makeit creates a codepage. Single-book sessions always use that book. */
export function makeitresolvecreatebook(): MAYBE<BOOK> {
  const books = memoryreadbooklist()
  if (books.length === 0) {
    return undefined
  }
  if (books.length === 1) {
    return books[0]
  }
  const bookid = makeitconfig.memoryread().bookid
  if (bookid) {
    const selected = memoryreadbookbyaddress(bookid)
    if (ispresent(selected)) {
      return selected
    }
  }
  return memoryreadmainbook() ?? memoryreadfirstbook()
}

/** Persist makeit create-target book id (tests + select bridge). */
export function makeitsetselectedbookid(bookid: string): void {
  makeitconfig.memorywrite({
    ...makeitconfig.memoryread(),
    bookid,
  })
}

registerhyperlinksharedbridge(
  'makeit',
  'select',
  (_typ, target) => {
    if (NAME(target) !== 'book') {
      return 0
    }
    return makeitbookselectindex()
  },
  (_typ, name, value) => {
    if (NAME(name) !== 'book') {
      return
    }
    if (!isnumber(value) && !isstring(value)) {
      return
    }
    const idx = Number(value)
    const books = memoryreadbooklist()
    if (!Number.isInteger(idx) || idx < 0 || idx >= books.length) {
      return
    }
    makeitsetselectedbookid(books[idx].id)
    void makeitconfig.save()
  },
)

function makeitlinktoken(s: string): string {
  if (/\s/.test(s) || s.length === 0) {
    return `"${escapedoublequoted(s)}"`
  }
  return s
}

function makeitbookselectline(): string {
  const books = memoryreadbooklist()
  const parts: string[] = ['book', 'select']
  for (let i = 0; i < books.length; ++i) {
    const label = books[i].name || books[i].id
    parts.push(makeitlinktoken(label))
    parts.push(`${i}`)
  }
  return zsszedlinkline(parts.join(' '), 'book')
}

function memoryensuremakeitcodepage<T extends CODE_PAGE_TYPE>(
  address: string,
  createtype: T,
) {
  return memoryensurecodepage(makeitresolvecreatebook(), createtype, address)
}

function makecodepagedesc(type: CODE_PAGE_TYPE, out: string[]) {
  switch (type) {
    case CODE_PAGE_TYPE.OBJECT:
      out.push('$greenobject - moving board elements')
      break
    case CODE_PAGE_TYPE.TERRAIN:
      out.push('$greenterrain - walkable, walls, or water')
      break
    case CODE_PAGE_TYPE.BOARD:
      out.push('$greenboard - 60 x 25 area of terrain & object')
      break
    case CODE_PAGE_TYPE.LOADER:
      out.push('$greenloader - run code on @event(s)')
      break
    case CODE_PAGE_TYPE.PALETTE:
      out.push('$greenpalette - custom 16 colors')
      break
    case CODE_PAGE_TYPE.CHARSET:
      out.push('$greencharset - custom ascii font')
      break
    case CODE_PAGE_TYPE.TXT:
      out.push('$greentxt - plain text notes (markdown in zns)')
      break
  }
}

function previewcodepage(codepage: CODE_PAGE, out: string[]) {
  const type = memoryreadcodepagetype(codepage)
  makecodepagedesc(type, out)
  const typelabel = memoryreadcodepagetypeasstring(codepage)
  const cpname = memoryreadcodepagename(codepage)
  out.push(
    zsszedlinkline(`edit ${codepage.id}`, `edit$CYAN @${typelabel} ${cpname}`),
  )
  const codelines = codepage.code.split('\n').slice(1, 6)
  for (let i = 0; i < codelines.length; ++i) {
    out.push(`$WHITE  ${codelines[i]}`)
  }
}

function checkforcodepage(name: string, out: string[]) {
  const codepages = memorylistcodepage(memoryreadbooklist(), { stat: name })
  for (let c = 0; c < codepages.length; ++c) {
    previewcodepage(codepages[c], out)
  }
  return codepages.length === 0
}

function findcodepage(nameorid: string): MAYBE<CODE_PAGE> {
  return memoryreadcodepage(memoryreadbooklist(), nameorid)
}

export function memorymakeitcommand(
  path: string,
  data: string[],
  player: string,
) {
  function writeopenpage(codepage: CODE_PAGE) {
    const type = memoryreadcodepagetypeasstring(codepage)
    const name = memoryreadcodepagename(codepage)
    write(
      SOFTWARE,
      player,
      `!pageopen ${codepage.id};$blue[${type}]$white ${name}`,
    )
  }

  function openeditor(codepage: MAYBE<CODE_PAGE>, didcreate: boolean) {
    if (ispresent(codepage)) {
      if (didcreate) {
        writeopenpage(codepage)
      }
      vmcli(SOFTWARE, player, `#pageopen ${codepage.id}`)
    }
  }

  switch (path) {
    case 'edit': {
      const [codepageid] = data
      openeditor(findcodepage(codepageid), false)
      break
    }
    case 'create': {
      const [type, name] = data
      // attempt to check first word as codepage type to create
      switch (type) {
        case stattypestring(STAT_TYPE.LOADER): {
          const [codepage, didcreate] = memoryensuremakeitcodepage(
            name,
            CODE_PAGE_TYPE.LOADER,
          )
          openeditor(codepage, didcreate)
          break
        }
        case stattypestring(STAT_TYPE.BOARD): {
          const [codepage] = memoryensuremakeitcodepage(
            name,
            CODE_PAGE_TYPE.BOARD,
          )
          if (ispresent(codepage)) {
            writeopenpage(codepage)
            const dest = {
              x: Math.round(BOARD_WIDTH * 0.5),
              y: Math.round(BOARD_HEIGHT * 0.5),
            }
            vmplayermovetoboard(SOFTWARE, player, player, codepage.id, dest)
          }
          break
        }
        case stattypestring(STAT_TYPE.OBJECT): {
          const [codepage, didcreate] = memoryensuremakeitcodepage(
            name,
            CODE_PAGE_TYPE.OBJECT,
          )
          openeditor(codepage, didcreate)
          break
        }
        case stattypestring(STAT_TYPE.TERRAIN): {
          const [codepage, didcreate] = memoryensuremakeitcodepage(
            name,
            CODE_PAGE_TYPE.TERRAIN,
          )
          openeditor(codepage, didcreate)
          break
        }
        case stattypestring(STAT_TYPE.CHARSET): {
          const [codepage, didcreate] = memoryensuremakeitcodepage(
            name,
            CODE_PAGE_TYPE.CHARSET,
          )
          openeditor(codepage, didcreate)
          break
        }
        case stattypestring(STAT_TYPE.PALETTE): {
          const [codepage, didcreate] = memoryensuremakeitcodepage(
            name,
            CODE_PAGE_TYPE.PALETTE,
          )
          openeditor(codepage, didcreate)
          break
        }
        case stattypestring(STAT_TYPE.TXT): {
          const [codepage, didcreate] = memoryensuremakeitcodepage(
            name,
            CODE_PAGE_TYPE.TXT,
          )
          openeditor(codepage, didcreate)
          break
        }
      }
      break
    }
  }
}

export async function memorymakeitscroll(makeit: string, player: string) {
  const [maybestat, maybelabel] = makeit.split(';')
  const words = maybestat.split(' ')
  const statname = statformat(maybelabel, words, true)
  const statvalue = statformat(maybelabel, words, false)

  function createmakecodepage(type: STAT_TYPE, name: string, out: string[]) {
    const typename = stattypestring(type)
    switch (type) {
      case STAT_TYPE.OBJECT:
        makecodepagedesc(CODE_PAGE_TYPE.OBJECT, out)
        break
      case STAT_TYPE.TERRAIN:
        makecodepagedesc(CODE_PAGE_TYPE.TERRAIN, out)
        break
      case STAT_TYPE.BOARD:
        makecodepagedesc(CODE_PAGE_TYPE.BOARD, out)
        break
      case STAT_TYPE.LOADER:
        makecodepagedesc(CODE_PAGE_TYPE.LOADER, out)
        break
      case STAT_TYPE.PALETTE:
        makecodepagedesc(CODE_PAGE_TYPE.PALETTE, out)
        break
      case STAT_TYPE.CHARSET:
        makecodepagedesc(CODE_PAGE_TYPE.CHARSET, out)
        break
      case STAT_TYPE.TXT:
        makecodepagedesc(CODE_PAGE_TYPE.TXT, out)
        break
    }
    const tn = makeitlinktoken(typename)
    const nm = makeitlinktoken(name)
    switch (type) {
      case STAT_TYPE.OBJECT:
        out.push(
          zsszedlinkline(
            `create hk o "" "" ${tn} ${nm}`,
            `create object$CYAN @${name}`,
          ),
        )
        break
      case STAT_TYPE.TERRAIN:
        out.push(
          zsszedlinkline(
            `create hk t "" "" ${tn} ${nm}`,
            `create$CYAN @terrain ${name}`,
          ),
        )
        break
      case STAT_TYPE.BOARD:
        out.push(
          zsszedlinkline(
            `create hk b "" "" ${tn} ${nm}`,
            `create$CYAN @board ${name}`,
          ),
        )
        break
      case STAT_TYPE.LOADER:
        out.push(
          zsszedlinkline(
            `create hk l "" "" ${tn} ${nm}`,
            `create$CYAN @loader ${name}`,
          ),
        )
        break
      case STAT_TYPE.PALETTE:
        out.push(
          zsszedlinkline(
            `create hk p "" "" ${tn} ${nm}`,
            `create$CYAN @palette ${name}`,
          ),
        )
        break
      case STAT_TYPE.CHARSET:
        out.push(
          zsszedlinkline(
            `create hk c "" "" ${tn} ${nm}`,
            `create$CYAN @charset ${name}`,
          ),
        )
        break
      case STAT_TYPE.TXT:
        out.push(
          zsszedlinkline(
            `create hk s "" "" ${tn} ${nm}`,
            `create$CYAN @txt ${name}`,
          ),
        )
        break
    }
    out.push('')
  }

  const scrolllines: string[] = []
  const nomatch = checkforcodepage(maybestat, scrolllines)
  if (nomatch) {
    const books = memoryreadbooklist()
    if (books.length > 1) {
      await makeitconfig.load()
      scrolllines.push(makeitbookselectline())
      scrolllines.push('')
    }
    switch (statname.type) {
      case STAT_TYPE.LOADER:
      case STAT_TYPE.BOARD:
      case STAT_TYPE.TERRAIN:
      case STAT_TYPE.CHARSET:
      case STAT_TYPE.PALETTE:
      case STAT_TYPE.TXT: {
        const value = statname.values.join(' ')
        createmakecodepage(statname.type, value, scrolllines)
        break
      }
      case STAT_TYPE.OBJECT:
        if (statvalue.values[0].toLowerCase() === 'object') {
          const values = statvalue.values.slice(1)
          const value = values.join(' ')
          createmakecodepage(statname.type, value, scrolllines)
        } else {
          const value = statvalue.values.join(' ')
          switch (statvalue.type) {
            case STAT_TYPE.CONST:
              createmakecodepage(STAT_TYPE.OBJECT, value, scrolllines)
              if (statvalue.values.length === 1) {
                createmakecodepage(STAT_TYPE.TERRAIN, value, scrolllines)
                createmakecodepage(STAT_TYPE.BOARD, value, scrolllines)
                createmakecodepage(STAT_TYPE.LOADER, value, scrolllines)
                createmakecodepage(STAT_TYPE.PALETTE, value, scrolllines)
                createmakecodepage(STAT_TYPE.CHARSET, value, scrolllines)
                createmakecodepage(STAT_TYPE.TXT, value, scrolllines)
              }
              scrolllines.push('$purple  if you typed in @char 12 or similar')
              scrolllines.push('$purple  try using #set <stat> <value> instead')
              scrolllines.push('$purple  or you can edit the @player codepage')
              scrolllines.push('$purple  to make changes to player stats')
              break
            case STAT_TYPE.RANGE:
            case STAT_TYPE.SELECT:
            case STAT_TYPE.NUMBER:
            case STAT_TYPE.TEXT:
            case STAT_TYPE.DIR:
            case STAT_TYPE.HOTKEY:
            case STAT_TYPE.COPYIT:
            case STAT_TYPE.OPENIT:
            case STAT_TYPE.VIEWIT:
            case STAT_TYPE.ZSSEDIT:
            case STAT_TYPE.CHAREDIT:
            case STAT_TYPE.COLOREDIT:
              break
          }
        }
        break
    }
  }

  scrollwritelines(player, 'makeit', zsstexttape(scrolllines), 'makeit')
}
