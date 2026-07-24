import { createsid } from 'zss/mapping/guid'
import { MAYBE, ispresent, isstring } from 'zss/mapping/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { WORD } from 'zss/words/types'

import { memorylistcodepagebytype, memoryreadcodepage } from './bookoperations'
import { memoryreadcodepagestats } from './codepageoperations'
import {
  memoryreadbookbysoftware,
  memoryreadoperator,
  memorystartloader,
} from './session'
import {
  BOARD,
  BOARD_ELEMENT,
  CODE_PAGE,
  CODE_PAGE_TYPE,
  MEMORY_LABEL,
} from './types'

export type LOADER_READ_CONTEXT_SNAPSHOT = {
  board: MAYBE<BOARD>
  element: MAYBE<BOARD_ELEMENT>
  elementid: string
  elementisplayer: boolean
  elementfocus: string
}

type LOADER_ENTRY = {
  arg: any
  format: string
  content: any
  player: string
  readcontext?: LOADER_READ_CONTEXT_SNAPSHOT
}

const LOADER_REFS: Record<string, LOADER_ENTRY> = {}

function defaultloaderreadcontext(): LOADER_READ_CONTEXT_SNAPSHOT {
  return {
    board: undefined,
    element: undefined,
    elementid: '',
    elementisplayer: false,
    elementfocus: memoryreadoperator(),
  }
}

function snapshotfromreadcontext(): LOADER_READ_CONTEXT_SNAPSHOT {
  return {
    board: READ_CONTEXT.board,
    element: READ_CONTEXT.element,
    elementid: READ_CONTEXT.elementid,
    elementisplayer: READ_CONTEXT.elementisplayer,
    elementfocus: READ_CONTEXT.elementfocus,
  }
}

function applyloadersnapshot(snapshot: LOADER_READ_CONTEXT_SNAPSHOT) {
  READ_CONTEXT.board = snapshot.board
  READ_CONTEXT.element = snapshot.element
  READ_CONTEXT.elementid = snapshot.elementid
  READ_CONTEXT.elementisplayer = snapshot.elementisplayer
  READ_CONTEXT.elementfocus = snapshot.elementfocus
}

/** Restore per-loader board/object targeting fields (or first-tick defaults). */
export function memoryloaderreadcontextapply(id: string) {
  const snapshot = LOADER_REFS[id]?.readcontext ?? defaultloaderreadcontext()
  applyloadersnapshot(snapshot)
}

/** Persist board/object targeting fields after a loader tick. */
export function memoryloaderreadcontextsave(id: string) {
  const entry = LOADER_REFS[id]
  if (!ispresent(entry)) {
    return
  }
  entry.readcontext = snapshotfromreadcontext()
}

/** Drop loader ref entry when chip ends. */
export function memoryloaderrelease(id: string) {
  delete LOADER_REFS[id]
}

export function memoryloader(
  arg: any,
  format: string,
  idoreventname: string,
  content: any,
  player: string,
) {
  const loaders = memoryloadermatches(format, idoreventname)
  // run matched loaders
  for (let i = 0; i < loaders.length; ++i) {
    const id = `${createsid()}_loader`
    LOADER_REFS[id] = {
      arg,
      format,
      content,
      player,
    }
    memorystartloader(id, loaders[i].code)
  }
}

export function memoryloaderarg(id: string): MAYBE<WORD> {
  return LOADER_REFS[id]?.arg
}

export function memoryloadercontent(id: string): any {
  return LOADER_REFS[id]?.content
}

export function memoryloaderformat(id: string): MAYBE<string> {
  return LOADER_REFS[id]?.format
}

export function memoryloadermatches(
  format: string,
  idoreventname: string,
): CODE_PAGE[] {
  // we scan main book for loaders
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return []
  }

  // first check for id match
  const maybecodepage = memoryreadcodepage(mainbook, idoreventname)
  if (ispresent(maybecodepage)) {
    return [maybecodepage]
  }

  const loaders = memorylistcodepagebytype(
    mainbook,
    CODE_PAGE_TYPE.LOADER,
  ).filter((codepage) => {
    const stats = memoryreadcodepagestats(codepage)

    /*
    we match against format & event stats
    @format text
    @event ^chat:message

    'need only one to match
    'but if both are provided, both must match
    @event ^chat:action
    */

    const formatstat = stats.format
    const formatstatmatch = isstring(formatstat)
      ? new RegExp(formatstat).test(format)
      : false

    const eventstat = stats.event
    const eventstatmatch = isstring(eventstat)
      ? new RegExp(eventstat).test(idoreventname)
      : false

    // we have to
    if (isstring(formatstat) && isstring(eventstat)) {
      return formatstatmatch && eventstatmatch
    }

    if (isstring(formatstat)) {
      return formatstatmatch
    }

    if (isstring(eventstat)) {
      return eventstatmatch
    }

    return false
  })

  // return matched loaders
  return loaders
}
