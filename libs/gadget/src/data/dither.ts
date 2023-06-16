/* eslint-disable @typescript-eslint/no-explicit-any */
import { createGuid } from '@zss/system/mapping/guid'
import {
  createMapGrid,
  getMapGridHeight,
  getMapGridValues,
  getMapGridValuesArray,
  getMapGridWidth,
} from '@zss/yjs/mapping'
import { MAYBE_ARRAY, MAYBE_MAP } from '@zss/yjs/types'
import * as Y from 'yjs'

import { GADGET_LAYER } from './layer'

export type DLDefault = {
  id?: string
  width: number
  height: number
  alpha: number[]
}

export function createTL(create: DLDefault) {
  const id = create.id || createGuid()
  const layer = new Y.Map<any>()

  layer.set('id', id)
  layer.set('type', GADGET_LAYER.TILES)
  layer.set('alpha', createMapGrid(create.width, create.height, create.alpha))

  return { id, layer }
}

type WriteDLFunc = ({
  width,
  height,
  alpha,
}: {
  width: number
  height: number
  alpha: MAYBE_ARRAY
}) => void

export function writeDL(layer: MAYBE_MAP, func: WriteDLFunc) {
  if (!layer) {
    return
  }

  const alpha: Y.Map<any> = layer.get('alpha')
  const width: number = getMapGridWidth(alpha) ?? 0
  const height: number = getMapGridHeight(alpha) ?? 0

  layer.doc?.transact(() => {
    func({
      width,
      height,
      alpha: getMapGridValues(alpha),
    })
  })
}

export function getDLState(layer: MAYBE_MAP): {
  width: number
  height: number
  alpha: number[]
} {
  if (!layer) {
    return {
      width: 1,
      height: 1,
      alpha: [0],
    }
  }

  const alpha: Y.Map<any> = layer.get('alpha')
  const width: number = getMapGridWidth(alpha) ?? 0
  const height: number = getMapGridHeight(alpha) ?? 0

  return {
    width,
    height,
    alpha: getMapGridValuesArray(alpha),
  }
}
