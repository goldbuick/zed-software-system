import { apitoast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { createnameid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { memorywriteterrain } from 'zss/memory/boardlifecycle'
import { memoryptwithinboard } from 'zss/memory/boardtransitions'
import { memorywritecodepage } from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import { memoryreadfirstcontentbook } from 'zss/memory/session'
import {
  BOARD,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CODE_PAGE_TYPE,
} from 'zss/memory/types'

export function importscreentopatchwork(
  player: string,
  patchworkname: string,
  width: number,
  height: number,
  screen: [number, number, number][],
  toastsuffix = 'file',
) {
  const contentbook = memoryreadfirstcontentbook()
  if (!ispresent(contentbook)) {
    return
  }

  const boardxcount = Math.ceil(width / BOARD_WIDTH)
  const boardycount = Math.ceil(height / BOARD_HEIGHT)

  const boards: MAYBE<BOARD>[] = []
  for (let i = 0; i < boardxcount * boardycount; ++i) {
    boards.push(undefined)
  }

  let sx = 0
  let sy = 0
  const id = createnameid()
  for (let i = 0; i < screen.length; ++i) {
    const x = sx % BOARD_WIDTH
    const y = sy % BOARD_HEIGHT
    const bx = Math.floor(sx / BOARD_WIDTH)
    const by = Math.floor(sy / BOARD_HEIGHT)
    const bi = bx + by * boardxcount

    let board = boards[bi]
    if (!ispresent(board)) {
      const stats: string[] = [
        `@${id}_${bx}_${by}`,
        `@exitnorth ${id}_${bx}_${by - 1}`,
        `@exitsouth ${id}_${bx}_${by + 1}`,
        `@exitwest ${id}_${bx - 1}_${by}`,
        `@exiteast ${id}_${bx + 1}_${by}`,
      ]
      const numeral = `${bi}`.padStart(3, '0')
      const code = `@board ${patchworkname} ${numeral}\n${stats.join('\n')}\n`
      const codepage = memorycreatecodepage(code, {})
      memorywritecodepage(contentbook, codepage)
      boards[bi] = board =
        memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(codepage)
    }

    if (ispresent(board) && memoryptwithinboard({ x, y })) {
      const [char, color, bg] = screen[i]
      memorywriteterrain(board, { x, y, kind: 'fake', char, color, bg })
    }

    ++sx
    if (sx >= width) {
      sx = 0
      ++sy
    }
  }

  apitoast(
    SOFTWARE,
    player,
    `imported ${toastsuffix} ${patchworkname} into ${contentbook.name} book`,
  )
}
