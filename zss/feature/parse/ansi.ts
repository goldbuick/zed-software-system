import getSimilarColor, { IDefaultColor } from 'get-similar-color/dist'
import { apitoast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { loadpalettefrombytes } from 'zss/feature/bytes'
import { PALETTE } from 'zss/feature/palette'
import { convertpalettetocolors } from 'zss/gadget/data/palette'
import { createnameid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { memoryreadfirstcontentbook } from 'zss/memory'
import {
  memorysetboardterrain,
  memoryptwithinboard,
} from 'zss/memory/boardoperations'
import { memorywritebookcodepage } from 'zss/memory/bookoperations'
import {
  memoryreadcodepagedata,
  memorycreatecodepage,
} from 'zss/memory/codepageoperations'
import {
  BOARD,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CODE_PAGE_TYPE,
} from 'zss/memory/types'

import { renderBytes } from './ansilove'

export function parseansi(
  player: string,
  filename: string,
  filetype: string,
  content: Uint8Array,
) {
  const contentbook = memoryreadfirstcontentbook()
  if (!ispresent(contentbook)) {
    return
  }

  renderBytes(
    content,
    (screendata, sauce) => {
      // create a new board codepage
      const title = sauce?.title ?? ''
      const author = sauce?.author ?? ''

      const colormap = new Map<number, number>()
      const palette = convertpalettetocolors(loadpalettefrombytes(PALETTE))

      if (ispresent(screendata.palette) && ispresent(palette)) {
        const colorlist: IDefaultColor[] = []
        for (let i = 0; i < palette.length; ++i) {
          const p = palette[i]
          colorlist.push({
            name: `${i}`,
            rgb: {
              r: Math.round(p.r * 255),
              g: Math.round(p.g * 255),
              b: Math.round(p.b * 255),
            },
          })
        }

        for (
          let sourcecolor = 0;
          sourcecolor < screendata.palette.length;
          ++sourcecolor
        ) {
          const r = screendata.palette[sourcecolor][0]
          const g = screendata.palette[sourcecolor][1]
          const b = screendata.palette[sourcecolor][2]
          const match = getSimilarColor({
            targetColor: { r, g, b },
            colorArray: colorlist,
          })
          const palettecolor = parseFloat(match?.name ?? '0')
          colormap.set(sourcecolor, palettecolor)
        }
      }

      // build a patchwork of connected boards to cover the area needed to render the ansi
      const patchworkname = `${title || filename}${author ? ` by ${author}` : ''}`
      const boardxcount = Math.ceil(screendata.width / BOARD_WIDTH)
      const boardycount = Math.ceil(screendata.height / BOARD_HEIGHT)

      const boards: MAYBE<BOARD>[] = []
      for (let i = 0; i < boardxcount * boardycount; ++i) {
        boards.push(undefined)
      }

      let sx = 0
      let sy = 0
      const id = createnameid()
      for (let i = 0; i < screendata.screen.length; ++i) {
        const x = sx % BOARD_WIDTH
        const y = sy % BOARD_HEIGHT
        const bx = Math.floor(sx / BOARD_WIDTH)
        const by = Math.floor(sy / BOARD_HEIGHT)
        const bi = bx + by * boardxcount

        // get target board
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
          memorywritebookcodepage(contentbook, codepage)
          // get board data from codepage
          boards[bi] = board =
            memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(codepage)
        }

        if (ispresent(board) && memoryptwithinboard({ x, y })) {
          const [char, fromcolor, frombg] = screendata.screen[i]
          const color = colormap.get(fromcolor) ?? 0
          const bg = colormap.get(frombg) ?? 0
          memorysetboardterrain(board, { x, y, kind: 'fake', char, color, bg })
        }

        ++sx
        if (sx >= screendata.width) {
          sx = 0
          ++sy
        }
      }

      apitoast(
        SOFTWARE,
        player,
        `imported ansi file ${patchworkname} into ${contentbook.name} book`,
      )
    },
    { filetype, imagedata: 1 },
  )
}
