import {
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
  WRITE_TEXT_CONTEXT,
} from 'zss/words/textformat'

import { useTilesData, writeTile } from '../gadget/hooks'

type ScrollBackPlateProps = {
  name: string
  width: number
  height: number
  context: WRITE_TEXT_CONTEXT
}

export function ScrollBackPlate({
  name,
  width,
  height,
  context,
}: ScrollBackPlateProps) {
  // write to tiles
  const tiles = useTilesData()

  // edges
  for (let x = 1; x < width - 1; ++x) {
    if (x > 2 && x < width - 1) {
      writeTile(tiles, width, height, x, 1, { char: 205, color: 15 })
    }
    writeTile(tiles, width, height, x, height - 1, { char: 205, color: 15 })
  }
  writeTile(tiles, width, height, width - 2, 0, { char: 196, color: 15 })
  writeTile(tiles, width, height, 1, 0, { char: 205, color: 15 })
  writeTile(tiles, width, height, 2, 0, { char: 187, color: 15 })
  writeTile(tiles, width, height, 2, 1, { char: 200, color: 15 })

  for (let y = 1; y < height - 1; ++y) {
    writeTile(tiles, width, height, 0, y, { char: 179, color: 15 })
    writeTile(tiles, width, height, width - 1, y, { char: 179, color: 15 })
  }

  for (let y = 2; y < height - 1; ++y) {
    writeTile(tiles, width, height, 1, y, { char: 0, color: 15 })
    writeTile(tiles, width, height, width - 2, y, { char: 0, color: 15 })
  }

  // corners
  // top left-right
  writeTile(tiles, width, height, 0, 0, { char: 213, color: 15 })
  writeTile(tiles, width, height, width - 1, 0, { char: 191, color: 15 })
  writeTile(tiles, width, height, width - 1, 1, { char: 181, color: 15 })
  // bottom left-right
  writeTile(tiles, width, height, 0, height - 1, { char: 212, color: 15 })
  writeTile(tiles, width, height, width - 1, height - 1, {
    char: 190,
    color: 15,
  })

  // measure title
  const title = ` ${name} `
  const measure = tokenizeandmeasuretextformat(title, width, height)

  // center title
  const titlewidth = measure?.x ?? title.length
  const centerwidth = width - 2
  context.x = 2 + Math.round(centerwidth * 0.5)
  context.x -= Math.round(titlewidth * 0.5)
  context.y++
  tokenizeandwritetextformat(title, context, true)

  return null
}
