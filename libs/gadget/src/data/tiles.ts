/* eslint-disable @typescript-eslint/no-explicit-any */
import { createGuid } from '@zss/system/mapping/guid'
import {
  createMapGrid,
  getMapGridValues,
  getMapGridValuesArray,
} from '@zss/yjs/mapping'
import { MAYBE_ARRAY, MAYBE_MAP } from '@zss/yjs/types'
import * as Y from 'yjs'

import { GADGET_LAYER } from './types'

export type TLDefault = {
  id?: string
  width: number
  height: number
  char: number[]
  color: number[]
  bg: number[]
}

export function createTL(create: TLDefault) {
  const id = create.id || createGuid()
  const layer = new Y.Map<any>()

  layer.set('id', id)
  layer.set('type', GADGET_LAYER.TILES)
  layer.set('width', create.width)
  layer.set('height', create.height)
  layer.set('char', createMapGrid(create.width, create.height, create.char))
  layer.set('color', createMapGrid(create.width, create.height, create.color))
  layer.set('bg', createMapGrid(create.width, create.height, create.bg))

  return { id, layer }
}

type WriteTLFunc = ({
  width,
  height,
  char,
  color,
  bg,
}: {
  width: number
  height: number
  char: MAYBE_ARRAY
  color: MAYBE_ARRAY
  bg: MAYBE_ARRAY
}) => void

export function writeTL(layer: MAYBE_MAP, func: WriteTLFunc) {
  if (!layer) {
    return
  }

  const width: number = layer.get('width') ?? 0
  const height: number = layer.get('height') ?? 0
  const char: Y.Map<any> = layer.get('char')
  const color: Y.Map<any> = layer.get('color')
  const bg: Y.Map<any> = layer.get('bg')

  layer.doc?.transact(() => {
    func({
      width,
      height,
      char: getMapGridValues(char),
      color: getMapGridValues(color),
      bg: getMapGridValues(bg),
    })
  })
}

export function getTLState(layer: MAYBE_MAP): {
  width: number
  height: number
  dimmed: boolean
  color: number[]
  char: number[]
  bg: number[]
} {
  if (!layer) {
    return {
      width: 1,
      height: 1,
      dimmed: false,
      color: [0],
      char: [0],
      bg: [0],
    }
  }

  const width: number = layer.get('width')
  const height: number = layer.get('height')
  const dimmed: boolean = layer.get('dimmed')
  const char: Y.Map<any> = layer.get('char')
  const color: Y.Map<any> = layer.get('color')
  const bg: Y.Map<any> = layer.get('bg')

  return {
    width,
    height,
    dimmed,
    char: getMapGridValuesArray(char),
    color: getMapGridValuesArray(color),
    bg: getMapGridValuesArray(bg),
  }
}
