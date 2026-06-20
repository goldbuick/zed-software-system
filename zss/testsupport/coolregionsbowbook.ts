import { readFileSync } from 'node:fs'

import { memoryimportbookfromjson } from 'zss/memory/bookoperations'
import { memorypickcodepagewithtypeandstat } from 'zss/memory/codepages'
import { memorywritebook } from 'zss/memory/session'
import type { BOOK } from 'zss/memory/types'
import { CODE_PAGE_TYPE } from 'zss/memory/types'
import { COOLREGIONSBOW_BOOK_JSON_PATH } from 'zss/testsupport/fixturepaths'

export { COOLREGIONSBOW_BOOK_JSON_PATH } from 'zss/testsupport/fixturepaths'

export type COOLREGIONSBOW_BOOK_EXPORT = {
  exported?: string
  data: BOOK
}

export function readcoolregionsbowbookexport(): COOLREGIONSBOW_BOOK_EXPORT {
  return JSON.parse(
    readFileSync(COOLREGIONSBOW_BOOK_JSON_PATH, 'utf8'),
  ) as COOLREGIONSBOW_BOOK_EXPORT
}

/** Books array for `vm:loader` / storage content hooks. */
export function readcoolregionsbowbooks(): BOOK[] {
  return [readcoolregionsbowbookexport().data]
}

/** Load coolregionsbow terrain/object pages when no element library is in memory. */
export function ensurezztelementlibrary() {
  if (memorypickcodepagewithtypeandstat(CODE_PAGE_TYPE.TERRAIN, 'solid')) {
    return
  }
  const book = memoryimportbookfromjson(readcoolregionsbowbookexport().data)
  if (book) {
    memorywritebook(book)
  }
}
