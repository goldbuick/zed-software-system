import { vm_cli } from 'zss/device/api'
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

import { bookreadcodepagebyaddress } from './book'
import { codepagereadname, codepagereadtypetostring } from './codepage'
import { CODE_PAGE, CODE_PAGE_TYPE } from './types'

import {
  MEMORY_LABEL,
  memoryensuresoftwarecodepage,
  memoryreadbooklist,
} from '.'

function findcodepage(nameorid: string): MAYBE<CODE_PAGE> {
  // first check for existing codepage with matching name or id
  const books = memoryreadbooklist()
  for (let i = 0; i < books.length; ++i) {
    const maybecodepage = bookreadcodepagebyaddress(books[i], nameorid)
    if (ispresent(maybecodepage)) {
      return maybecodepage
    }
  }
  return undefined
}

function checkforcodepage(name: string, player: string) {
  // first check for existing codepage with matching name or id
  const books = memoryreadbooklist()

  let nomatch = true
  for (let i = 0; i < books.length; ++i) {
    // note: we should change this to return all matches by name
    const maybecodepage = bookreadcodepagebyaddress(books[i], name)
    // we should denote __which__ book these pages are from
    if (ispresent(maybecodepage)) {
      nomatch = false
      gadgethyperlink(
        player,
        'makeit',
        `edit @${codepagereadtypetostring(maybecodepage)} ${codepagereadname(maybecodepage)}`,
        ['edit', '', maybecodepage.id],
      )
      // We should show the first 5 lines of the codepage here
    }
  }

  return nomatch
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
        gadgettext(player, '$green  object - moving board elements')
        break
      case STAT_TYPE.TERRAIN:
        gadgettext(player, '$green  terrain - walkable, walls, or water')
        break
      case STAT_TYPE.BOARD:
        gadgettext(player, '$green  board - 60 x 25 area of terrain & object')
        break
      case STAT_TYPE.LOADER:
        gadgettext(player, '$green  loader - run code on @event(s)')
        break
      case STAT_TYPE.PALETTE:
        gadgettext(player, '$green  palette - custom 16 colors')
        break
      case STAT_TYPE.CHARSET:
        gadgettext(player, '$green  charset - custom ascii font')
        break
    }
    if (type !== STAT_TYPE.OBJECT) {
      gadgethyperlink(player, 'makeit', `create @${typename} ${name}`, [
        'create',
        '',
        typename,
        name,
      ])
    } else {
      gadgethyperlink(player, 'makeit', `create object @${name}`, [
        'create',
        '',
        typename,
        name,
      ])
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
              gadgettext(player, '$green  if you typed in @char 12 or similar')
              gadgettext(
                player,
                '$green  try using #set <stat> <value> instead',
              )
              gadgettext(player, '$green  or you can edit the @player codepage')
              gadgettext(player, '$green  to make changes to player stats')
              checkforcodepage('player', player)
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
              gadgettext(
                player,
                '$greenyou can try editing the @player codepage',
              )
              checkforcodepage('player', player)
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

export function memorymakeitcommand(
  path: string,
  data: string[],
  player: string,
) {
  function openeditor(codepage: MAYBE<CODE_PAGE>, didcreate: boolean) {
    doasync(SOFTWARE, player, async () => {
      if (ispresent(codepage)) {
        const type = codepagereadtypetostring(codepage)
        const name = codepagereadname(codepage)
        if (didcreate) {
          write(
            SOFTWARE,
            player,
            `!pageopen ${codepage.id};$blue[${type}]$white ${name}`,
          )
        }
        // wait a little
        await waitfor(800)
        // open codepage
        vm_cli(SOFTWARE, player, `#pageopen ${codepage.id}`)
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
          const [codepage, didcreate] = memoryensuresoftwarecodepage(
            MEMORY_LABEL.MAIN,
            name,
            CODE_PAGE_TYPE.BOARD,
          )
          openeditor(codepage, didcreate)
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
