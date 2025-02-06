import { createsid } from 'zss/mapping/guid'
import { ispresent, isstring, MAYBE } from 'zss/mapping/types'
import { WORD } from 'zss/words/types'

import { bookreadcodepagesbytype } from './book'
import { codepagereadstats } from './codepage'
import { CODE_PAGE_TYPE } from './types'

import { MEMORY_LABEL, memorystartloader, memoryreadbookbysoftware } from '.'

type LOADER_ENTRY = {
  arg: any
  format: string
  content: any
  player: string
}

const LOADER_REFS: Record<string, LOADER_ENTRY> = {}

export function memoryloaderdone(id: string) {
  delete LOADER_REFS[id]
}

export function memoryloaderarg(id: string): MAYBE<WORD> {
  return LOADER_REFS[id]?.arg
}

export function memoryloaderformat(id: string): MAYBE<string> {
  return LOADER_REFS[id]?.format
}

export function memoryloadercontent(id: string): any {
  return LOADER_REFS[id]?.content
}

export function memoryloaderplayer(id: string): MAYBE<string> {
  return LOADER_REFS[id]?.player
}

export function memoryloader(
  arg: any,
  format: string,
  eventname: string,
  content: any,
  player: string,
) {
  // we scan main book for loaders
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const loaders = bookreadcodepagesbytype(
    mainbook,
    CODE_PAGE_TYPE.LOADER,
  ).filter((codepage) => {
    const stats = codepagereadstats(codepage)

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
      ? new RegExp(eventstat).test(eventname)
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
