import { vmcli } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { write } from 'zss/feature/writeui'
import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import { doasync } from 'zss/mapping/func'
import { waitfor } from 'zss/mapping/tick'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { statformat, stattypestring } from 'zss/words/stats'
import { STAT_TYPE } from 'zss/words/types'

import { memorylistcodepagebystat, memoryreadcodepage } from './bookoperations'
import {
  memoryreadcodepagename,
  memoryreadcodepagetype,
  memoryreadcodepagetypeasstring,
} from './codepageoperations'
import { memorymoveplayertoboard } from './playermanagement'
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CODE_PAGE,
  CODE_PAGE_TYPE,
  MEMORY_LABEL,
} from './types'

import {
  memoryensuresoftwarecodepage,
  memoryreadbookbysoftware,
  memoryreadbooklist,
} from '.'

function makecodepagedesc(type: CODE_PAGE_TYPE, player: string) {
  switch (type) {
    case CODE_PAGE_TYPE.OBJECT:
      gadgettext(player, '$greenobject - moving board elements')
      break
    case CODE_PAGE_TYPE.TERRAIN:
      gadgettext(player, '$greenterrain - walkable, walls, or water')
      break
    case CODE_PAGE_TYPE.BOARD:
      gadgettext(player, '$greenboard - 60 x 25 area of terrain & object')
      break
    case CODE_PAGE_TYPE.LOADER:
      gadgettext(player, '$greenloader - run code on @event(s)')
      break
    case CODE_PAGE_TYPE.PALETTE:
      gadgettext(player, '$greenpalette - custom 16 colors')
      break
    case CODE_PAGE_TYPE.CHARSET:
      gadgettext(player, '$greencharset - custom ascii font')
      break
  }
}

function previewcodepage(codepage: CODE_PAGE, player: string) {
  const type = memoryreadcodepagetype(codepage)
  makecodepagedesc(type, player)
  gadgethyperlink(
    player,
    'makeit',
    `edit$CYAN @${memoryreadcodepagetypeasstring(codepage)} ${memoryreadcodepagename(codepage)}`,
    ['edit', '', codepage.id],
  )
  // We should show the first 5 lines of the codepage here
  const lines = codepage.code.split('\n').slice(1, 6)
  lines.forEach((line) => gadgettext(player, `$WHITE  ${line}`))
}

function checkforcodepage(name: string, player: string) {
  // first check for existing codepage with matching name or id
  const books = memoryreadbooklist()

  let nomatch = true
  for (let i = 0; i < books.length; ++i) {
    // scan for id / name / stat matches
    const codepages = memorylistcodepagebystat(books[i], name)
    for (let c = 0; c < codepages.length; ++c) {
      nomatch = false
      previewcodepage(codepages[c], player)
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
            const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
            const dest = {
              x: Math.round(BOARD_WIDTH * 0.5),
              y: Math.round(BOARD_HEIGHT * 0.5),
            }
            memorymoveplayertoboard(mainbook, player, codepage.id, dest)
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

  function createmakecodepage(type: STAT_TYPE, name: string) {
    const typename = stattypestring(type)
    switch (type) {
      case STAT_TYPE.OBJECT:
        makecodepagedesc(CODE_PAGE_TYPE.OBJECT, player)
        break
      case STAT_TYPE.TERRAIN:
        makecodepagedesc(CODE_PAGE_TYPE.TERRAIN, player)
        break
      case STAT_TYPE.BOARD:
        makecodepagedesc(CODE_PAGE_TYPE.BOARD, player)
        break
      case STAT_TYPE.LOADER:
        makecodepagedesc(CODE_PAGE_TYPE.LOADER, player)
        break
      case STAT_TYPE.PALETTE:
        makecodepagedesc(CODE_PAGE_TYPE.PALETTE, player)
        break
      case STAT_TYPE.CHARSET:
        makecodepagedesc(CODE_PAGE_TYPE.CHARSET, player)
        break
    }
    switch (type) {
      case STAT_TYPE.OBJECT:
        gadgethyperlink(player, 'makeit', `create object$CYAN @${name}`, [
          'create',
          'hk',
          'o',
          '',
          '',
          typename,
          name,
        ])
        break
      case STAT_TYPE.TERRAIN:
        gadgethyperlink(player, 'makeit', `create$CYAN @terrain ${name}`, [
          'create',
          'hk',
          't',
          '',
          '',
          typename,
          name,
        ])
        break
      case STAT_TYPE.BOARD:
        gadgethyperlink(player, 'makeit', `create$CYAN @board ${name}`, [
          'create',
          'hk',
          'b',
          '',
          '',
          typename,
          name,
        ])
        break
      case STAT_TYPE.LOADER:
        gadgethyperlink(player, 'makeit', `create$CYAN @loader ${name}`, [
          'create',
          'hk',
          'l',
          '',
          '',
          typename,
          name,
        ])
        break
      case STAT_TYPE.PALETTE:
        gadgethyperlink(player, 'makeit', `create$CYAN @palette ${name}`, [
          'create',
          'hk',
          'p',
          '',
          '',
          typename,
          name,
        ])
        break
      case STAT_TYPE.CHARSET:
        gadgethyperlink(player, 'makeit', `create$CYAN @charset ${name}`, [
          'create',
          'hk',
          'c',
          '',
          '',
          typename,
          name,
        ])
        break
    }
    gadgettext(player, '')
  }

  // first check for existing codepage with matching name or id
  const nomatch = checkforcodepage(maybestat, player)
  if (nomatch) {
    switch (statname.type) {
      case STAT_TYPE.LOADER:
      case STAT_TYPE.BOARD:
      case STAT_TYPE.TERRAIN:
      case STAT_TYPE.CHARSET:
      case STAT_TYPE.PALETTE: {
        const value = statname.values.join(' ')
        createmakecodepage(statname.type, value)
        break
      }
      case STAT_TYPE.OBJECT:
        if (statvalue.values[0].toLowerCase() === 'object') {
          const values = statvalue.values.slice(1)
          const value = values.join(' ')
          createmakecodepage(statname.type, value)
        } else {
          const value = statvalue.values.join(' ')
          switch (statvalue.type) {
            case STAT_TYPE.CONST:
              createmakecodepage(STAT_TYPE.OBJECT, value)
              if (statvalue.values.length === 1) {
                createmakecodepage(STAT_TYPE.TERRAIN, value)
                createmakecodepage(STAT_TYPE.BOARD, value)
                createmakecodepage(STAT_TYPE.LOADER, value)
                createmakecodepage(STAT_TYPE.PALETTE, value)
                createmakecodepage(STAT_TYPE.CHARSET, value)
              }
              gadgettext(player, '$purple  if you typed in @char 12 or similar')
              gadgettext(
                player,
                '$purple  try using #set <stat> <value> instead',
              )
              gadgettext(
                player,
                '$purple  or you can edit the @player codepage',
              )
              gadgettext(player, '$purple  to make changes to player stats')
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

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scrollname = 'makeit'
  shared.scroll = gadgetcheckqueue(player)
}
