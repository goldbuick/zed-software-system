import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { unique } from 'zss/mapping/array'
import { ispid } from 'zss/mapping/guid'
import { MAYBE, isnumber, ispresent, isstring } from 'zss/mapping/types'
import { maptonumber } from 'zss/mapping/value'
import { createos } from 'zss/os'
import { COLLISION, PT } from 'zss/words/types'

import {
  boardcheckblockedobject,
  boarddeleteobject,
  boardelementisobject,
  boardnamedwrite,
  boardobjectcreatefromkind,
  boardobjectlookupwrite,
  boardobjectnamedlookupdelete,
  boardobjectread,
  boardvisualsupdate,
} from './boardoperations'
import {
  bookclearflags,
  bookreadflag,
  bookreadflags,
  bookwriteflag,
} from './bookoperations'
import { codepagereaddata } from './codepageoperations'
import { boardcheckcollide } from './spatialqueries'
import {
  BOARD,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BOOK,
  BOOK_FLAGS,
  CODE_PAGE_TYPE,
} from './types'

import {
  MEMORY_LABEL,
  memoryboardinit,
  memoryboardread,
  memoryelementstatread,
  memorypickcodepagewithtype,
  memoryreadbookbysoftware,
} from './index'

// manages chips
const os = createos()

// Player Management Functions

export function memoryplayerlogin(
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
    return true
  }

  // fallback to placing on the title board
  if (!ispresent(currentboard)) {
    const titlepage = memorypickcodepagewithtype(
      CODE_PAGE_TYPE.BOARD,
      MEMORY_LABEL.TITLE,
    )
    currentboard = codepagereaddata<CODE_PAGE_TYPE.BOARD>(titlepage)
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
  const playerkind = memorypickcodepagewithtype(
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
  const startx = currentboard.startx ?? 0
  const starty = currentboard.starty ?? 0
  const px = isnumber(startx) ? startx : Math.round(BOARD_WIDTH * 0.5)
  const py = isnumber(starty) ? starty : Math.round(BOARD_HEIGHT * 0.5)
  const obj = boardobjectcreatefromkind(
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
    const flags = bookreadflags(mainbook, player)
    // assign stick flags
    Object.assign(flags, stickyflags)
    // good values
    flags.enterx = px
    flags.entery = py
    flags.deaths = flags.deaths ?? 0
    flags.highscore = flags.highscore ?? 0

    // track current board
    bookplayersetboard(mainbook, player, currentboard.id)
    return true
  }

  return false
}

export function memoryplayerlogout(player: string, isendgame: boolean) {
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
    const flags = bookreadflags(mainbook, remove)

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
    bookplayersetboard(mainbook, remove, '')

    // clear element
    boardobjectnamedlookupdelete(board, boardobjectread(board, remove))
    boarddeleteobject(board, remove)

    // halt chip
    os.halt(remove)

    // clear memory
    bookclearflags(mainbook, remove)

    // set carry-over values
    if (isendgame) {
      const newflags = bookreadflags(mainbook, remove)
      Object.assign(newflags, saveflags)
    }
  }
}

export function memoryreadplayerboard(player: string) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const address = bookreadflag(mainbook, player, 'board') as string
  const codepage = memorypickcodepagewithtype(CODE_PAGE_TYPE.BOARD, address)
  return codepagereaddata<CODE_PAGE_TYPE.BOARD>(codepage)
}

export function memoryreadplayeractive(player: string) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const isactive = bookplayerreadactive(mainbook, player)
  const board = memoryreadplayerboard(player)
  const playerelement = boardobjectread(board, player)
  return isactive && ispresent(playerelement)
}

export function memoryplayerscan(players: Record<string, number>) {
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
  const boards = bookplayerreadboards(mainbook)
  for (let i = 0; i < boards.length; ++i) {
    const board = boards[i]
    const objects = Object.keys(board.objects)
    for (let o = 0; o < objects.length; ++o) {
      const object = board.objects[objects[o]]
      const objectid = object.id
      if (ispid(objectid)) {
        // ensure marked location
        bookplayersetboard(mainbook, objectid, board.id)
        // ensure tracking
        if (!ispresent(players[objectid])) {
          players[objectid] = 0
        }
      }
    }
  }
}

// Book Player Management Functions

export function bookplayerreadactive(book: MAYBE<BOOK>, player: string) {
  return book?.activelist.includes(player) ?? false
}

export function bookplayersetboard(
  book: MAYBE<BOOK>,
  player: string,
  board: string,
) {
  if (!ispresent(book)) {
    return
  }
  // write board flag
  bookwriteflag(book, player, 'board', board)

  // determine if player is on a board
  const maybeboard = memoryboardread(board)
  if (ispresent(maybeboard)) {
    // ensure player is listed as active
    if (!book.activelist.includes(player)) {
      book.activelist.push(player)
    }
  } else {
    // ensure player is not listed as active
    book.activelist = book.activelist.filter((id) => id !== player)
  }
}

export function bookplayermovetoboard(
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

  // player element
  const element = boardobjectread(currentboard, player)
  if (!boardelementisobject(element) || !element?.id) {
    return false
  }

  // dest board
  const destboard = memoryboardread(board)
  if (!ispresent(destboard)) {
    return false
  }

  // make sure lookup is created
  memoryboardinit(destboard)

  // read target spot
  const maybeobject = boardcheckblockedobject(
    destboard,
    COLLISION.ISWALK,
    dest,
    true,
  )

  // blocked by non-object
  if (!ispresent(maybeobject) && !boardelementisobject(maybeobject)) {
    const terraincollision = memoryelementstatread(maybeobject, 'collision')
    if (boardcheckcollide(COLLISION.ISWALK, terraincollision)) {
      return false
    }
  }

  // remove from current board lookups
  boardobjectnamedlookupdelete(currentboard, element)
  // hard remove player element
  delete currentboard.objects[element.id]

  // add to dest board
  element.x = dest.x
  element.y = dest.y
  destboard.objects[element.id] = element

  // add to dest board lookups
  boardnamedwrite(destboard, element)
  boardobjectlookupwrite(destboard, element)

  // updating tracking
  bookwriteflag(book, player, 'enterx', dest.x)
  bookwriteflag(book, player, 'entery', dest.y)
  bookplayersetboard(book, player, destboard.id)

  // we did move
  return true
}

function bookplayerreadboardids(book: MAYBE<BOOK>) {
  const activelist = book?.activelist ?? []
  const boardids = activelist.map((player) => {
    const value = bookreadflag(book, player, 'board')
    return isstring(value) ? value : ''
  })
  return unique(boardids)
}

export function bookplayerreadboards(book: MAYBE<BOOK>) {
  const ids = bookplayerreadboardids(book)
  const addedids = new Set<string>()
  const mainboards: BOARD[] = []
  for (let i = 0; i < ids.length; ++i) {
    const board = memoryboardread(ids[i])
    // only process once
    if (ispresent(board) && !addedids.has(board.id)) {
      // update resolve caches
      boardvisualsupdate(board)

      // see if we have an over board
      // it runs first
      const over = memoryboardread(board.overboard ?? '')
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
