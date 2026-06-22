import { memoryimportbookfromjson } from 'zss/memory/bookoperations'
import { memorypickcodepagewithtypeandstat } from 'zss/memory/codepages'
import { memorywritebook } from 'zss/memory/session'
import type { BOOK } from 'zss/memory/types'
import { CODE_PAGE_TYPE } from 'zss/memory/types'

import { COOLREGIONSBOW_BOOK_JSON_PATH } from './fixturepaths'

export { COOLREGIONSBOW_BOOK_JSON_PATH } from './fixturepaths'

export type COOLREGIONSBOW_BOOK_EXPORT = {
  exported?: string
  data: BOOK
}

function readcoolregionsbowbookfromdisk(): COOLREGIONSBOW_BOOK_EXPORT {
  const { readFileSync } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('node:fs') as typeof import('node:fs')
  return JSON.parse(
    readFileSync(COOLREGIONSBOW_BOOK_JSON_PATH, 'utf8'),
  ) as COOLREGIONSBOW_BOOK_EXPORT
}

export function readcoolregionsbowbookexport(): COOLREGIONSBOW_BOOK_EXPORT {
  return readcoolregionsbowbookfromdisk()
}

/** Books array for headless storage hooks and task pipelines. */
export function readcoolregionsbowbooks(): BOOK[] {
  return [readcoolregionsbowbookexport().data]
}

/** Load coolregionsbow terrain/object pages when no element library is in memory. */
export function loadcoolregionsbowelementlibrary() {
  if (memorypickcodepagewithtypeandstat(CODE_PAGE_TYPE.TERRAIN, 'solid')) {
    return
  }
  const book = memoryimportbookfromjson(readcoolregionsbowbookexport().data)
  if (book) {
    memorywritebook(book)
  }
}
