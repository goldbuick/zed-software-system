import { ispresent } from 'zss/mapping/types'
import { createboard } from 'zss/memory/board'
import { bookreadcodepagewithtype } from 'zss/memory/book'
import { codepagereaddata } from 'zss/memory/codepage'
import { CODE_PAGE_TYPE } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { PT } from 'zss/words/types'

export function boardweave(
  target: string,
  dir: PT,
  p1: PT,
  p2: PT,
  targetset: string,
) {
  const targetcodepage = bookreadcodepagewithtype(
    READ_CONTEXT.book,
    CODE_PAGE_TYPE.BOARD,
    target,
  )
  const targetboard = codepagereaddata<CODE_PAGE_TYPE.BOARD>(targetcodepage)
  if (!ispresent(targetboard)) {
    return
  }

  // create tmp board for terrain
  const tmpboard = createboard()
}
