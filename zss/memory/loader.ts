import { createsid } from 'zss/mapping/guid'
import { ispresent } from 'zss/mapping/types'

import { bookreadcodepagesbytype } from './book'
import { codepagereadstats } from './codepage'
import { CODE_PAGE_TYPE } from './types'

import { MEMORY_LABEL, memoryloaderstart, memoryreadbookbysoftware } from '.'

const EVENT_BY_ID: Record<string, any> = {}
const CONTENT_BY_ID: Record<string, any> = {}

export function memoryloaderdone(id: string) {
  delete CONTENT_BY_ID[id]
}

export function memoryloaderevent(id: string) {
  return EVENT_BY_ID[id]
}

export function memoryloadercontent(id: string) {
  return CONTENT_BY_ID[id]
}

export function memoryloader(event: string, content: any) {
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
    // check for stat being set
    return !!stats[event]
  })

  // run matched loaders
  for (let i = 0; i < loaders.length; ++i) {
    const id = createsid()
    EVENT_BY_ID[id] = event
    CONTENT_BY_ID[id] = content
    memoryloaderstart(id, loaders[i].code)
  }
}
