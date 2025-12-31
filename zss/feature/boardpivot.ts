import { linepoints } from 'zss/mapping/2d'
import { ispresent } from 'zss/mapping/types'
import { memoryinitboard, memoryreadboard } from 'zss/memory'
import { memorycreateboard } from 'zss/memory/boardoperations'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { PT } from 'zss/words/types'

export function boardpivot(
  target: string,
  theta: number,
  _p1: PT,
  _p2: PT,
  targetset: string,
) {
  if (!ispresent(READ_CONTEXT.book)) {
    return
  }
  const targetboard = memoryreadboard(target)
  if (!ispresent(targetboard)) {
    return
  }

  // create tmp board for terrain
  const tmpboard = memorycreateboard()
  const pivotobject = targetset === 'all' || targetset === 'object'
  const pivotterrain = targetset === 'all' || targetset === 'terrain'

  // make sure lookup is created
  memoryinitboard(targetboard)
  memoryinitboard(tmpboard)

  const alpha = -Math.tan(theta * 0.5)
  const beta = Math.sin(theta)

  // calc shear amount
  const xshear = Math.round(12.5 * alpha)
  const yshear = Math.round(12.5 * beta)

  // x shear
  const xedge = new Array(BOARD_HEIGHT).fill(0)
  const xline = linepoints(xshear, 0, -xshear, BOARD_HEIGHT - 1)
  xline.forEach((pt) => {
    if (pt.x < 0) {
      xedge[pt.y] = Math.min(xedge[pt.y], pt.x)
    } else {
      xedge[pt.y] = Math.max(xedge[pt.y], pt.x)
    }
  })

  // y shear
  const yedge = new Array(BOARD_WIDTH).fill(0)
  const yline = linepoints(0, yshear, BOARD_WIDTH - 1, -yshear)
  yline.forEach((pt) => {
    if (pt.y < 0) {
      yedge[pt.x] = Math.min(yedge[pt.x], pt.y)
    } else {
      yedge[pt.x] = Math.max(yedge[pt.x], pt.y)
    }
  })

  // apply shears
  const transformset = [xedge, yedge, xedge]
  for (let i = 0; i < transformset.length; ++i) {
    const edge = transformset[i]

    // x shear
    if (i !== 1) {
      for (let y = 0; y < BOARD_HEIGHT; ++y) {
        const skew = edge[y]
        const row = y * BOARD_WIDTH
        for (let x = 0; x < BOARD_WIDTH; x++) {
          const xskew = (x + skew + BOARD_WIDTH) % BOARD_WIDTH
          if (pivotterrain) {
            tmpboard.terrain[xskew + row] = targetboard.terrain[x + row]
          }
        }
      }
      if (pivotobject) {
        const ids = Object.keys(targetboard.objects)
        for (let o = 0; o < ids.length; ++o) {
          const id = ids[o]
          const { x, y } = targetboard.objects[id]
          if (ispresent(x) && ispresent(y)) {
            const skew = edge[y]
            targetboard.objects[id].x = (x + skew + BOARD_WIDTH) % BOARD_WIDTH
            targetboard.objects[id].lx = targetboard.objects[id].x
          }
        }
      }
    }

    // y shear
    if (i === 1) {
      for (let x = 0; x < BOARD_WIDTH; ++x) {
        const skew = edge[x]
        for (let y = 0; y < BOARD_HEIGHT; ++y) {
          const yskew = (y + skew + BOARD_HEIGHT) % BOARD_HEIGHT
          if (pivotterrain) {
            tmpboard.terrain[x + yskew * BOARD_WIDTH] =
              targetboard.terrain[x + y * BOARD_WIDTH]
          }
        }
      }
      if (pivotobject) {
        const ids = Object.keys(targetboard.objects)
        for (let o = 0; o < ids.length; ++o) {
          const id = ids[o]
          const { x, y } = targetboard.objects[id]
          if (ispresent(x) && ispresent(y)) {
            const skew = edge[x]
            targetboard.objects[id].y = (y + skew + BOARD_HEIGHT) % BOARD_HEIGHT
            targetboard.objects[id].ly = targetboard.objects[id].y
          }
        }
      }
    }

    // replace terrain array
    if (pivotterrain) {
      targetboard.terrain = [...tmpboard.terrain]
    }

    // reset all lookups
    memoryinitboard(tmpboard)
    memoryinitboard(targetboard)
  }
}
