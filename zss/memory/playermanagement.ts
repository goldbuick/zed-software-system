import { createchipid } from 'zss/chip'
import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { skipboardrunners } from 'zss/device/vm/state'
import { getclimode } from 'zss/feature/detect'
import { unique } from 'zss/mapping/array'
import { ispid } from 'zss/mapping/guid'
import { MAYBE, isnumber, ispresent, isstring } from 'zss/mapping/types'
import { maptonumber } from 'zss/mapping/value'
import { COLLISION, PT } from 'zss/words/types'

import { memoryreadobject } from './boardaccess'
import { memorycheckblockedboardobject } from './boardblocking'
import { memoryboardelementisobject } from './boardelement'
import {
  memorycreateboardobjectfromkind,
  memorydeleteboardobject,
} from './boardlifecycle'
import {
  memorydeleteboardobjectnamedlookup,
  memorywriteboardnamed,
  memorywriteboardobjectlookup,
} from './boardlookup'
import {
  memoryinitboard,
  memoryreadboardbyaddress,
  memoryreadelementstat,
} from './boards'
import { memoryupdateboardvisuals } from './boardvisuals'
import {
  memoryclearbookflags,
  memorypeekbookflag,
  memoryreadbookflag,
  memoryreadbookflags,
  memorywritebookflag,
} from './bookoperations'
import { memoryreadcodepagedata } from './codepageoperations'
import { memorypickcodepagewithtypeandstat } from './codepages'
import {
  flagsstream,
  memorymarkboarddirty,
  memorymarkdirty,
  memorymarkmemorydirty,
} from './memorydirty'
import { memoryhaltchip } from './runtime'
import { memoryisoperator, memoryreadbookbysoftware } from './session'
import { memorycheckcollision } from './spatialqueries'
import {
  BOARD,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BOOK,
  BOOK_FLAGS,
  CODE_PAGE_TYPE,
  MEMORY_LABEL,
} from './types'

// Player Management Functions

export function memorymoveplayertoboard(
  book: MAYBE<BOOK>,
  player: string,
  board: string,
  dest: PT,
) {
  // current board
  const currentboard = memoryreadplayerboard(player)
  if (!ispresent(book) || !ispresent(currentboard)) {
    return false
  }

  // Ensure runtime caches (lookup/named) and per-element overlay state
  // (category) are populated on currentboard. On the server side the
  // reverse-projection replaces board.objects with copies that lack
  // `category` (BOARD_ELEMENT_SYNC_TOPKEYS excludes it) and the server
  // sim runs `memorytickloaders` (no board tick) so memoryinitboard is never otherwise called.
  // Without this, memoryboardelementisobject() below rejects the element
  // and the server's fallback transfer path silently aborts.
  memoryinitboard(currentboard)

  // player element
  const element = memoryreadobject(currentboard, player)
  if (!memoryboardelementisobject(element) || !element?.id) {
    return false
  }

  // dest board
  const destboard = memoryreadboardbyaddress(board)
  if (!ispresent(destboard)) {
    return false
  }

  // make sure lookup is created
  memoryinitboard(destboard)

  // read target spot
  const maybeobject = memorycheckblockedboardobject(
    destboard,
    COLLISION.ISWALK,
    dest,
    true,
  )

  // blocked by non-object
  if (!ispresent(maybeobject) && !memoryboardelementisobject(maybeobject)) {
    const terraincollision = memoryreadelementstat(maybeobject, 'collision')
    if (memorycheckcollision(COLLISION.ISWALK, terraincollision)) {
      return false
    }
  }

  // remove from current board lookups
  memorydeleteboardobjectnamedlookup(currentboard, element)
  // hard remove player element
  delete currentboard.objects[element.id]
  memorymarkboarddirty(currentboard)

  // add to dest board
  element.x = dest.x
  element.y = dest.y
  destboard.objects[element.id] = element
  memorymarkboarddirty(destboard)

  // add to dest board lookups
  memorywriteboardnamed(destboard, element)
  memorywriteboardobjectlookup(destboard, element)

  // updating tracking
  memorywritebookflag(book, player, 'enterx', dest.x)
  memorywritebookflag(book, player, 'entery', dest.y)
  memorywritebookplayerboard(book, player, destboard.id)

  // we did move
  return true
}

function bookplayerreadboardids(book: MAYBE<BOOK>) {
  const activelist = book?.activelist ?? []
  const boardids = activelist.map((player) => {
    const value = memorypeekbookflag(book, player, 'board')
    return isstring(value) ? value : ''
  })
  return unique(boardids)
}

/** True when `flags[pid]` exists on the book and has an authoritative `board` (no auto-create reads). */
export function memoryplayerflagsready(book: MAYBE<BOOK>, playerId: string) {
  const b = memorypeekbookflag(book, playerId, 'board')
  return isstring(b) && b.length > 0
}

export function memoryreadbookplayers(book: MAYBE<BOOK>) {
  return book?.activelist ?? []
}

export function memoryreadbookplayeractive(book: MAYBE<BOOK>, player: string) {
  return memoryreadbookplayers(book).includes(player) ?? false
}

export function memoryreadbookplayerboards(book: MAYBE<BOOK>) {
  const ids = bookplayerreadboardids(book)
  const addedids = new Set<string>()
  const mainboards: BOARD[] = []
  for (let i = 0; i < ids.length; ++i) {
    const board = memoryreadboardbyaddress(ids[i])
    // only process once
    if (ispresent(board) && !addedids.has(board.id)) {
      // update resolve caches
      memoryupdateboardvisuals(board)

      // see if we have an over board
      // it runs first
      const over = memoryreadboardbyaddress(board.overboard ?? '')
      if (ispresent(over)) {
        // only add once
        if (!addedids.has(over.id)) {
          mainboards.push(over)
        }
      }

      // followed by the mainboard
      mainboards.push(board)
    }
  }
  return mainboards
}

export function memorywritebookplayerboard(
  book: MAYBE<BOOK>,
  player: string,
  board: string,
) {
  if (!ispresent(book)) {
    return
  }
  // write board flag
  memorywritebookflag(book, player, 'board', board)

  // determine if player is on a board
  const maybeboard = memoryreadboardbyaddress(board)
  const before = book.activelist.length
  if (ispresent(maybeboard)) {
    // ensure player is listed as active
    if (!book.activelist.includes(player)) {
      book.activelist.push(player)
    }
  } else {
    // ensure player is not listed as active
    book.activelist = book.activelist.filter((id) => id !== player)
  }
  if (before !== book.activelist.length) {
    memorymarkmemorydirty()
  }
}

export function memoryloginplayer(
  player: string,
  stickyflags: BOOK_FLAGS,
): boolean {
  if (!isstring(player) || !player) {
    return apierror(
      SOFTWARE,
      player,
      'login',
      `failed for playerid ==>${player}<==`,
    )
  }

  // clear the skip flag
  delete skipboardrunners[player]

  // check for main
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return apierror(
      SOFTWARE,
      player,
      'login:main',
      `login failed to find book 'main'`,
      'login',
      `failed for playerid ==>${player}<==`,
    )
  }

  // if we have a current board, and a player on said board
  let currentboard = memoryreadplayerboard(player)
  if (ispresent(currentboard?.objects[player])) {
    const flags = memoryreadbookflags(mainbook, player)
    Object.assign(flags, stickyflags)
    memorymarkdirty(flagsstream(player))
    return true
  }

  // fallback to placing on the title board
  if (!ispresent(currentboard)) {
    const titlepage = memorypickcodepagewithtypeandstat(
      CODE_PAGE_TYPE.BOARD,
      MEMORY_LABEL.TITLE,
    )
    currentboard = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(titlepage)
  }

  // unable to find board
  if (!ispresent(currentboard)) {
    return apierror(
      SOFTWARE,
      player,
      'login:title',
      `login failed to find board with '${MEMORY_LABEL.TITLE}' stat`,
    )
  }

  // unable to find kind
  const playerkind = memorypickcodepagewithtypeandstat(
    CODE_PAGE_TYPE.OBJECT,
    MEMORY_LABEL.PLAYER,
  )
  if (!ispresent(playerkind)) {
    return apierror(
      SOFTWARE,
      player,
      'login:player',
      `login failed to find object type '${MEMORY_LABEL.PLAYER}'`,
    )
  }

  // plotting a new player
  const isheadlessop = getclimode() && memoryisoperator(player)
  const startx = currentboard.startx ?? 0
  const starty = currentboard.starty ?? 0
  const px = isheadlessop
    ? -100000
    : isnumber(startx)
      ? startx
      : Math.round(BOARD_WIDTH * 0.5)
  const py = isheadlessop
    ? -100000
    : isnumber(starty)
      ? starty
      : Math.round(BOARD_HEIGHT * 0.5)
  const obj = memorycreateboardobjectfromkind(
    currentboard,
    {
      x: px,
      y: py,
    },
    MEMORY_LABEL.PLAYER,
    player,
  )
  if (ispresent(obj?.id)) {
    // all players self-aggro
    obj.player = player

    // setup flags
    const flags = memoryreadbookflags(mainbook, player)
    // assign stick flags
    Object.assign(flags, stickyflags)
    // good values
    flags.enterx = px
    flags.entery = py
    flags.deaths = flags.deaths ?? 0
    flags.highscore = flags.highscore ?? 0
    memorymarkdirty(flagsstream(player))

    // track current board
    memorywritebookplayerboard(mainbook, player, currentboard.id)
    return true
  }

  return false
}

export function memorylogoutplayer(player: string, isendgame: boolean) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const removelist: string[] = []
  for (let i = 0; i < mainbook.activelist.length; ++i) {
    const mayberemove = mainbook.activelist[i]
    if (mayberemove.startsWith(player)) {
      removelist.push(mayberemove)
    }
  }

  const board = memoryreadplayerboard(player)
  for (let i = 0; i < removelist.length; ++i) {
    const remove = removelist[i]

    // get current flags
    const flags = memoryreadbookflags(mainbook, remove)

    // capture carry-over values
    const saveflags: Record<string, any> = {}
    if (isendgame) {
      // we track deaths & highscore
      saveflags.deaths = maptonumber(flags.deaths, 0) + 1
      saveflags.highscore = Math.max(
        maptonumber(flags.score, 0),
        maptonumber(flags.highscore, 0),
      )
    }

    // clear from active list
    memorywritebookplayerboard(mainbook, remove, '')

    // clear element
    memorydeleteboardobjectnamedlookup(board, memoryreadobject(board, remove))
    memorydeleteboardobject(board, remove)

    // halt chip
    memoryhaltchip(remove)

    // clear chip memory
    memoryclearbookflags(mainbook, createchipid(remove))

    // clear memory
    memoryclearbookflags(mainbook, remove)

    // set carry-over values
    if (isendgame) {
      const newflags = memoryreadbookflags(mainbook, remove)
      Object.assign(newflags, saveflags)
      memorymarkdirty(flagsstream(remove))
    }
  }
}

export function memoryscanplayers(players: Record<string, number>) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)

  // ensure we're tracking all ids listed in book
  const activelist = mainbook?.activelist ?? []
  for (let i = 0; i < activelist.length; ++i) {
    const objectid = activelist[i]
    if (!ispresent(players[objectid])) {
      players[objectid] = 0
    }
  }

  // ensure we're tracking any orphaned player elements
  const boards = memoryreadbookplayerboards(mainbook)
  for (let i = 0; i < boards.length; ++i) {
    const board = boards[i]
    const objects = Object.keys(board.objects)
    for (let o = 0; o < objects.length; ++o) {
      const object = board.objects[objects[o]]
      const objectid = object.id
      if (ispid(objectid)) {
        // If flags already say this pid is on board X and X actually holds the
        // player object, do not repoint from a duplicate element on another board
        // (scan order would otherwise flash the wrong board in elections / acks).
        const booked = memoryreadbookflag(mainbook, objectid, 'board') as string
        if (isstring(booked) && booked.length > 0) {
          const canonical = memoryreadboardbyaddress(booked)
          if (
            ispresent(canonical?.id) &&
            memoryboardelementisobject(memoryreadobject(canonical, objectid))
          ) {
            if (board.id !== canonical.id) {
              if (!ispresent(players[objectid])) {
                players[objectid] = 0
              }
              continue
            }
          }
        }
        // ensure marked location
        memorywritebookplayerboard(mainbook, objectid, board.id)
        // ensure tracking
        if (!ispresent(players[objectid])) {
          players[objectid] = 0
        }
      }
    }
  }
}

export function memoryreadplayersfromboard(board: string): string[] {
  const maybeboard = memoryreadboardbyaddress(board)
  return Object.keys(maybeboard?.objects ?? {}).filter((id) => ispid(id))
}

export function memoryreadplayers() {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  return memoryreadbookplayers(mainbook)
}

export function memoryreadplayeractive(player: string) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const isactive = memoryreadbookplayeractive(mainbook, player)
  const board = memoryreadplayerboard(player)
  const playerelement = memoryreadobject(board, player)
  return isactive && ispresent(playerelement)
}

export function memoryreadplayerboard(player: string) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const address = memoryreadbookflag(mainbook, player, 'board') as string
  return memoryreadboardbyaddress(address)
}
