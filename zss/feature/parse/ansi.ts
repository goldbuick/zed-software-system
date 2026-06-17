import getSimilarColor, { IDefaultColor } from 'get-similar-color/dist'
import { loadpalettefrombytes } from 'zss/feature/bytes'
import { PALETTE } from 'zss/feature/palette'
import { convertpalettetocolors } from 'zss/gadget/data/palette'
import { ispresent } from 'zss/mapping/types'
import { memoryreadfirstcontentbook } from 'zss/memory/session'

import { renderbytes } from './ansilove'
import { importscreentopatchwork } from './patchworkimport'

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

  renderbytes(
    content,
    (screendata, sauce) => {
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

      const patchworkname = `${title || filename}${author ? ` by ${author}` : ''}`
      const screen: [number, number, number][] = []
      for (let i = 0; i < screendata.screen.length; ++i) {
        const [char, fromcolor, frombg] = screendata.screen[i]
        const color = colormap.get(fromcolor) ?? 0
        const bg = colormap.get(frombg) ?? 0
        screen.push([char, color, bg])
      }

      importscreentopatchwork(
        player,
        patchworkname,
        screendata.width,
        screendata.height,
        screen,
        'ansi file',
      )
    },
    { filetype, imagedata: 1 },
  )
}
