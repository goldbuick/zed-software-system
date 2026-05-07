import { vmcli, vmplayermovetoboard } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { write } from 'zss/feature/writeui'
import { zsstexttape, zsszedlinkline } from 'zss/feature/zsstextui'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { doasync } from 'zss/mapping/func'
import { waitfor } from 'zss/mapping/tick'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { statformat, stattypestring } from 'zss/words/stats'
import { STAT_TYPE } from 'zss/words/types'

import { memorylistcodepagebystat, memoryreadcodepage } from './bookoperations'
import { memoryensuresoftwarecodepage } from './books'
import {
  memoryreadcodepagename,
  memoryreadcodepagetype,
  memoryreadcodepagetypeasstring,
} from './codepageoperations'
import { memoryreadbooklist } from './session'
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CODE_PAGE,
  CODE_PAGE_TYPE,
  MEMORY_LABEL,
} from './types'

function makeitlinktoken(s: string): string {
  if (/\s/.test(s) || s.length === 0) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }
  return s
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
  }
}

function previewcodepage(codepage: CODE_PAGE, out: string[]) {
  const type = memoryreadcodepagetype(codepage)
  makecodepagedesc(type, out)
  const typelabel = memoryreadcodepagetypeasstring(codepage)
  const cpname = memoryreadcodepagename(codepage)
  out.push(
    zsszedlinkline(
      `edit "" ${codepage.id}`,
      `edit$CYAN @${typelabel} ${cpname}`,
    ),
  )
  const codelines = codepage.code.split('\n').slice(1, 6)
  for (let i = 0; i < codelines.length; ++i) {
    out.push(`$WHITE  ${codelines[i]}`)
  }
}

function checkforcodepage(name: string, out: string[]) {
  const books = memoryreadbooklist()

  let nomatch = true
  for (let i = 0; i < books.length; ++i) {
    const codepages = memorylistcodepagebystat(books[i], name)
    for (let c = 0; c < codepages.length; ++c) {
      nomatch = false
      previewcodepage(codepages[c], out)
    }
  }

  return nomatch
}

function findcodepage(nameorid: string): MAYBE<CODE_PAGE> {
  // first check for existing codepage with matching name or id
  const books = memoryreadbooklist()
  for (let i = 0; i < books.length; ++i) {
    const maybecodepage = memoryreadcodepage(books[i], nameorid)
    if (ispresent(maybecodepage)) {
      return maybecodepage
    }
  }
  return undefined
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
    doasync(SOFTWARE, player, async () => {
      if (ispresent(codepage)) {
        if (didcreate) {
          writeopenpage(codepage)
        }
        // wait a little
        await waitfor(800)
        // open codepage
        vmcli(SOFTWARE, player, `#pageopen ${codepage.id}`)
      }
    })
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
          const [codepage, didcreate] = memoryensuresoftwarecodepage(
            MEMORY_LABEL.MAIN,
            name,
            CODE_PAGE_TYPE.LOADER,
          )
          openeditor(codepage, didcreate)
          break
        }
        case stattypestring(STAT_TYPE.BOARD): {
          const [codepage] = memoryensuresoftwarecodepage(
            MEMORY_LABEL.MAIN,
            name,
            CODE_PAGE_TYPE.BOARD,
          )
          if (ispresent(codepage)) {
            writeopenpage(codepage)
            // const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
            const dest = {
              x: Math.round(BOARD_WIDTH * 0.5),
              y: Math.round(BOARD_HEIGHT * 0.5),
            }
            vmplayermovetoboard(SOFTWARE, player, player, codepage.id, dest)
            // memorymoveplayertoboard(mainbook, player, codepage.id, dest)
          }
          break
        }
        case stattypestring(STAT_TYPE.OBJECT): {
          const [codepage, didcreate] = memoryensuresoftwarecodepage(
            MEMORY_LABEL.MAIN,
            name,
            CODE_PAGE_TYPE.OBJECT,
          )
          openeditor(codepage, didcreate)
          break
        }
        case stattypestring(STAT_TYPE.TERRAIN): {
          const [codepage, didcreate] = memoryensuresoftwarecodepage(
            MEMORY_LABEL.MAIN,
            name,
            CODE_PAGE_TYPE.TERRAIN,
          )
          openeditor(codepage, didcreate)
          break
        }
        case stattypestring(STAT_TYPE.CHARSET): {
          const [codepage, didcreate] = memoryensuresoftwarecodepage(
            MEMORY_LABEL.MAIN,
            name,
            CODE_PAGE_TYPE.CHARSET,
          )
          openeditor(codepage, didcreate)
          break
        }
        case stattypestring(STAT_TYPE.PALETTE): {
          const [codepage, didcreate] = memoryensuresoftwarecodepage(
            MEMORY_LABEL.MAIN,
            name,
            CODE_PAGE_TYPE.PALETTE,
          )
          openeditor(codepage, didcreate)
          break
        }
      }
      break
    }
  }
}

export function memorymakeitscroll(makeit: string, player: string) {
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
    }
    out.push('')
  }

  const scrolllines: string[] = []
  const nomatch = checkforcodepage(maybestat, scrolllines)
  if (nomatch) {
    switch (statname.type) {
      case STAT_TYPE.LOADER:
      case STAT_TYPE.BOARD:
      case STAT_TYPE.TERRAIN:
      case STAT_TYPE.CHARSET:
      case STAT_TYPE.PALETTE: {
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
