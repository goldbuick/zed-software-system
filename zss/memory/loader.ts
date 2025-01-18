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
  filename: string,
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
    const stat = codepagereadstats(codepage)[format]
    if (isstring(stat)) {
      const regex = new RegExp(stat, 'i')
      return regex.test(filename)
    }
    return ispresent(stat)
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
