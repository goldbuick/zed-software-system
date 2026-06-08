import { readFileSync } from 'node:fs'
import path from 'node:path'

import type { BOOK } from 'zss/memory/types'

const REPO_ROOT = process.cwd()

/** Shipped coolregionsbow export used by sim e2e, CLI bootstrap, and jest. */
export const COOLREGIONSBOW_BOOK_JSON_PATH = path.join(
  REPO_ROOT,
  'src/fixtures/example-coolregionsbow.book.json',
)

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
