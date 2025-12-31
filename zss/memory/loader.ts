import { createsid } from 'zss/mapping/guid'
import { MAYBE, ispresent, isstring } from 'zss/mapping/types'
import { WORD } from 'zss/words/types'

import {
  memoryreadcodepagebyaddress,
  memorylistcodepagebytype,
} from './bookoperations'
import { memorystartloader } from './cliruntime'
import { memoryreadcodepagestats } from './codepageoperations'
import { CODE_PAGE, CODE_PAGE_TYPE, MEMORY_LABEL } from './types'

import { memoryreadbookbysoftware } from '.'

type LOADER_ENTRY = {
  arg: any
  format: string
  content: any
  player: string
}

const LOADER_REFS: Record<string, LOADER_ENTRY> = {}

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

export function memoryloaderdone(id: string) {
  delete LOADER_REFS[id]
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
  const maybecodepage = memoryreadcodepagebyaddress(mainbook, idoreventname)
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

export function memoryloaderplayer(id: string): MAYBE<string> {
  return LOADER_REFS[id]?.player
}
