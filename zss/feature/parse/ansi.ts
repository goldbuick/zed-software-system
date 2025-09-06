import getSimilarColor, { IDefaultColor } from 'get-similar-color/dist'
import { api_toast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { convertpalettetocolors } from 'zss/gadget/data/palette'
import { ispresent } from 'zss/mapping/types'
import { memoryreadfirstcontentbook } from 'zss/memory'
import { boardsetterrain, ptwithinboard } from 'zss/memory/board'
import { bookwritecodepage } from 'zss/memory/book'
import {
  codepagereaddata,
  codepagereadname,
  createcodepage,
} from 'zss/memory/codepage'
import { CODE_PAGE_TYPE } from 'zss/memory/types'

import { loadpalettefrombytes } from '../bytes'
import { PALETTE } from '../palette'

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
      const code = `@board ${title || filename}${author ? ` by ${author}` : ''}\n`
      const codepage = createcodepage(code, {})
      const codepagename = codepagereadname(codepage)
      bookwritecodepage(contentbook, codepage)

      // get board data from codepage
      const board = codepagereaddata<CODE_PAGE_TYPE.BOARD>(codepage)
      if (!ispresent(board)) {
        return
      }

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
            similarityThreshold: 0.5,
          })
          const palettecolor = parseFloat(match?.name ?? '0')
          colormap.set(sourcecolor, palettecolor)
        }
      }

      let x = 0
      let y = 0
      for (let i = 0; i < screendata.screen.length; ++i) {
        if (ptwithinboard({ x, y })) {
          const [char, fromcolor, frombg] = screendata.screen[i]
          const color = colormap.get(fromcolor) ?? 0
          const bg = colormap.get(frombg) ?? 0
          boardsetterrain(board, { x, y, kind: 'fake', char, color, bg })
        }
        ++x
        if (x >= screendata.width) {
          x = 0
          ++y
        }
      }

      api_toast(
        SOFTWARE,
        player,
        `imported ansi file ${codepagename} into ${contentbook.name} book`,
      )
    },
    { filetype, imagedata: 1 },
  )
}
