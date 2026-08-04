import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { getclimode } from 'zss/feature/detect'
import { shuffle, unique } from 'zss/mapping/array'
import { createtrackingid, ispid } from 'zss/mapping/guid'
import {
  MAYBE,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import { maptonumber } from 'zss/mapping/value'
import { COLLISION, PT } from 'zss/words/types'

import { memoryreadobject } from './boardaccess'
import { memoryboardelementisobject } from './boardelement'
import {
  memorycreateboardobjectfromkind,
  memorydeleteboardobject,
} from './boardlifecycle'
import {
  memorydeleteboardobjectnamedlookup,
  memoryresetboardlookups,
  memorywriteboardnamed,
  memorywriteboardobjectlookup,
} from './boardlookup'
import { memorycheckblockedboardobject } from './boardmovement'
import { memoryreadboardbyaddress, memoryreadelementstat } from './boards'
import { memoryupdateboardvisuals } from './boardvisuals'
import {
  memoryclearbookflags,
  memorylistcodepagebytype,
  memoryreadbookflag,
  memoryreadbookflags,
  memorywritebookflag,
} from './bookoperations'
import { memoryreadcodepagedata } from './codepageoperations'
import { memorypickcodepagewithtypeandstat } from './codepages'
import { memoryhaltchip } from './runtime'
import { memoryreadboardruntime } from './runtimeboundary'
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

/** Read-only: boards where objects[player] exists (orphan evidence). */
export function memorydebugcountplayerboards(player: string): {
  count: number
  boardids: string[]
  flagsboard: string
} {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const flagvalue = memoryreadbookflag(mainbook, player, 'board')
  const flagsboard = isstring(flagvalue) ? flagvalue : ''
  const boardids: string[] = []
  const pages = memorylistcodepagebytype(mainbook, CODE_PAGE_TYPE.BOARD)
  for (let i = 0; i < pages.length; ++i) {
    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(pages[i])
    if (ispresent(board?.objects[player])) {
      boardids.push(board.id)
    }
  }
  return { count: boardids.length, boardids, flagsboard }
}

/** Remove player object from every board (optional keepboardid). */
export function memorypurgeplayerboardcopies(
  player: string,
  keepboardid?: string,
) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const pages = memorylistcodepagebytype(mainbook, CODE_PAGE_TYPE.BOARD)
  for (let i = 0; i < pages.length; ++i) {
    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(pages[i])
    if (!ispresent(board) || board.id === keepboardid) {
      continue
    }
    if (!ispresent(board.objects[player])) {
      continue
    }
    memorydeleteboardobjectnamedlookup(board, memoryreadobject(board, player))
    memorydeleteboardobject(board, player)
  }
}

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

  // ensure sure the lookup is created for the current board
  memoryresetboardlookups(currentboard)

  // player element
  const element = memoryreadobject(currentboard, player)
  if (!memoryboardelementisobject(element)) {
    return false
  }
  if (!element?.id) {
    return false
  }

  // dest board
  const destboard = memoryreadboardbyaddress(board)
  if (!ispresent(destboard)) {
    return false
  }

  // make sure lookup is created
  memoryresetboardlookups(destboard)

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
  memorydeleteboardobject(currentboard, element.id)

  // what are we missing here?
  // need to figure out why we're getting lingering player elements
  // ?? at least when moving a player to a new board

  // add to dest board
  element.x = dest.x
  element.y = dest.y
  destboard.objects[element.id] = element

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
    const value = memoryreadbookflag(book, player, 'board')
    return isstring(value) ? value : ''
  })
  return unique(boardids)
}

export function memoryreadbookplayeractive(book: MAYBE<BOOK>, player: string) {
  return book?.activelist.includes(player) ?? false
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
      const over = memoryreadboardbyaddress(
        memoryreadboardruntime(board)?.overboard ?? '',
      )
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

    // track current board
    memorywritebookplayerboard(mainbook, player, currentboard.id)
    return true
  }

  return false
}

export function memorylogoutplayer(player: string) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const removelist: string[] = []
  for (let i = 0; i < mainbook.activelist.length; ++i) {
    const mayberemove = mainbook.activelist[i]
    // this is a hack to ensure we drop local players from the active list
    if (mayberemove.startsWith(player)) {
      removelist.push(mayberemove)
    }
  }
  // Always process this pid even when activelist / flags.board are already empty
  if (!removelist.includes(player)) {
    removelist.push(player)
  }

  for (let i = 0; i < removelist.length; ++i) {
    const remove = removelist[i]

    // get current flags
    const flags = memoryreadbookflags(mainbook, remove)

    // capture carry-over values
    const saveflags: Record<string, any> = {}
    // we track deaths & highscore
    saveflags.deaths = maptonumber(flags.deaths, 0) + 1
    saveflags.highscore = Math.max(
      maptonumber(flags.score, 0),
      maptonumber(flags.highscore, 0),
    )

    // clear from active list
    memorywritebookplayerboard(mainbook, remove, '')

    // clear every board copy (not only flags.board)
    memorypurgeplayerboardcopies(remove)

    // halt chip
    memoryhaltchip(remove)

    // clear memory
    memoryclearbookflags(mainbook, remove)

    // set carry-over values
    const newflags = memoryreadbookflags(mainbook, remove)
    Object.assign(newflags, saveflags)
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
  const codepage = memorypickcodepagewithtypeandstat(
    CODE_PAGE_TYPE.BOARD,
    address,
  )
  return memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(codepage)
}

const WITHPLAYERBOARD_TRACKING = 'withplayerboard'
const TRACKING_IDS_KEY = 'ids'

function memorylistactiveplayerids(): string[] {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const activelist = mainbook?.activelist ?? []
  const out: string[] = []
  for (let i = 0; i < activelist.length; ++i) {
    const player = activelist[i]
    if (memoryreadplayeractive(player)) {
      out.push(player)
    }
  }
  return out
}

/**
 * Next board for an active player, cycling each player once via
 * `withplayerboard_tracking.ids` shuffle queue (same pattern as @pick shuffle).
 */
export function memorypicknextactiveplayerboard(): MAYBE<BOARD> {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return undefined
  }
  const trackingflags = memoryreadbookflags(
    mainbook,
    createtrackingid(WITHPLAYERBOARD_TRACKING),
  )
  let reshuffled = false
  for (;;) {
    let sourceids = trackingflags[TRACKING_IDS_KEY]
    if (!isarray(sourceids) || sourceids.length === 0) {
      if (reshuffled) {
        delete trackingflags[TRACKING_IDS_KEY]
        return undefined
      }
      const actives = memorylistactiveplayerids()
      if (actives.length === 0) {
        delete trackingflags[TRACKING_IDS_KEY]
        return undefined
      }
      trackingflags[TRACKING_IDS_KEY] = shuffle(actives)
      sourceids = trackingflags[TRACKING_IDS_KEY]
      reshuffled = true
    }
    const queue = sourceids as string[]
    const first = queue.shift()
    if (queue.length === 0) {
      delete trackingflags[TRACKING_IDS_KEY]
    }
    if (!isstring(first) || !memoryreadplayeractive(first)) {
      continue
    }
    const board = memoryreadplayerboard(first)
    if (!ispresent(board)) {
      continue
    }
    return board
  }
}
