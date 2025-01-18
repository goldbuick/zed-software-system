import { createsid } from 'zss/mapping/guid'
import { ispresent, isstring } from 'zss/mapping/types'

import { bookreadcodepagesbytype } from './book'
import { codepagereadstats } from './codepage'
import { CODE_PAGE_TYPE } from './types'

import { MEMORY_LABEL, memoryloaderstart, memoryreadbookbysoftware } from '.'

const FORMAT_BY_ID: Record<string, any> = {}
const CONTENT_BY_ID: Record<string, any> = {}

export function memoryloaderdone(id: string) {
  delete CONTENT_BY_ID[id]
}

export function memoryloaderformat(id: string) {
  return FORMAT_BY_ID[id]
}

export function memoryloadercontent(id: string) {
  return CONTENT_BY_ID[id]
}

export function memoryloader(format: string, filename: string, content: any) {
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
    const id = createsid()
    FORMAT_BY_ID[id] = format
    CONTENT_BY_ID[id] = content
    memoryloaderstart(id, loaders[i].code)
  }
}
