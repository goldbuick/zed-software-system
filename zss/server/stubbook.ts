/**
 * Minimal stub book with @player and @board. Used when content lacks both.
 * Required for memoryloginplayer (needs title board + player object kind).
 */
import {
  memorycreatebook,
  memoryensurebookcodepagewithtype,
  memorywritecodepage,
} from 'zss/memory/bookoperations'
import {
  CODE_PAGE_TYPE,
  MEMORY_LABEL,
  BOARD_WIDTH,
  BOARD_HEIGHT,
} from 'zss/memory/types'

export function createstubbook() {
  const book = memorycreatebook([])
  book.name = MEMORY_LABEL.MAIN

  // @player OBJECT - required for memoryloginplayer
  const [playerPage] = memoryensurebookcodepagewithtype(
    book,
    CODE_PAGE_TYPE.OBJECT,
    MEMORY_LABEL.PLAYER,
  )
  if (playerPage) {
    playerPage.code = `@${MEMORY_LABEL.PLAYER}\n`
  }

  // @board title - required for memoryloginplayer (default spawn board)
  const [boardPage] = memoryensurebookcodepagewithtype(
    book,
    CODE_PAGE_TYPE.BOARD,
    MEMORY_LABEL.TITLE,
  )
  if (boardPage) {
    const cx = Math.round(BOARD_WIDTH * 0.5)
    const cy = Math.round(BOARD_HEIGHT * 0.5)
    boardPage.code = `@board ${MEMORY_LABEL.TITLE}\nstartx ${cx}\nstarty ${cy}\n`
  }

  return book
}
