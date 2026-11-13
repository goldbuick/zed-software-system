import { useTilesData, writetile } from 'zss/gadget/tiles'
import { COLOR } from 'zss/words/types'

type SidebarBackPlateProps = {
  width: number
  height: number
}

/** Flat DKBLUE field behind sidebar content (no scroll frame chrome). */
export function SidebarBackPlate({ width, height }: SidebarBackPlateProps) {
  const tiles = useTilesData()
  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      writetile(tiles, width, height, x, y, {
        char: 0,
        color: COLOR.WHITE,
        bg: COLOR.DKBLUE,
      })
    }
  }
  tiles.changed()
  return null
}
