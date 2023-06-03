/* eslint-disable @typescript-eslint/no-explicit-any */
import { createGuid } from '@zss/system/mapping/guid'
import {
  getMapGridValuesArray,
  createMapGrid,
  getMapGridValues,
  setMapGridValue,
  recycleMapGridValues,
} from '@zss/yjs/mapping'
import { MAYBE_ARRAY, MAYBE_MAP } from '@zss/yjs/types'
import * as Y from 'yjs'

import { GADGET_LAYER } from './types'

/*
 * there are different kinds of layers
 * tiles (xy coords that match width & height of gadget)
 * objects (indivial outlined chars with xy coords with animated transitions)
 * input elements (button, radio button, text input, code edit, with animated transitions)
 */

// COMMON for all layers

export function getLId(layer: MAYBE_MAP): string {
  return layer?.get('id') || ''
}

export function getLType(layer: MAYBE_MAP): GADGET_LAYER {
  return layer?.get('type') || GADGET_LAYER.BLANK
}

// COMMON for TILES & SPRITES LAYERS
export function setLCharSet(layer: MAYBE_MAP, charSet: string) {
  layer?.set('charSet', charSet)
}

export function getLCharSet(layer: MAYBE_MAP): string {
  return layer?.get('charSet') || ''
}

export function setLDimmed(layer: MAYBE_MAP, dimmed: boolean) {
  layer?.set('dimmed', dimmed)
}

export function getLDimmed(layer: MAYBE_MAP): boolean {
  return layer?.get('dimmed') || false
}

// TILES LAYER

export type TLDefault = {
  id?: string
  width: number
  height: number
  chars: number[]
  colors: number[]
}

export function createTL(create: TLDefault) {
  const id = create.id || createGuid()
  const layer = new Y.Map<any>()

  layer.set('id', id)
  layer.set('type', GADGET_LAYER.TILES)
  layer.set('width', create.width)
  layer.set('height', create.height)
  layer.set('chars', createMapGrid(create.width, create.height, create.chars))
  layer.set('colors', createMapGrid(create.width, create.height, create.colors))

  return { id, layer }
}

type WriteTLFunc = ({
  width,
  height,
  chars,
  colors,
}: {
  width: number
  height: number
  chars: MAYBE_ARRAY
  colors: MAYBE_ARRAY
}) => void

export function writeTL(layer: MAYBE_MAP, func: WriteTLFunc) {
  if (!layer) {
    return
  }

  const width: number = layer.get('width') ?? 0
  const height: number = layer.get('height') ?? 0
  const chars: Y.Map<any> = layer.get('chars')
  const colors: Y.Map<any> = layer.get('colors')

  layer.doc?.transact(() => {
    func({
      width,
      height,
      chars: getMapGridValues(chars),
      colors: getMapGridValues(colors),
    })
  })
}

export function setTLChar(
  chars: MAYBE_ARRAY,
  width: number,
  height: number,
  x: number,
  y: number,
  char: number,
) {
  if (!chars) {
    return
  }

  if (
    chars === undefined ||
    width < 1 ||
    height < 1 ||
    x < 0 ||
    x >= width ||
    y < 0 ||
    y >= height
  ) {
    return
  }

  setMapGridValue(chars, width, x, y, char)
}

export function setTLColor(
  colors: MAYBE_ARRAY,
  width: number,
  height: number,
  x: number,
  y: number,
  color: number,
) {
  if (!colors) {
    return
  }

  if (
    colors === undefined ||
    width < 1 ||
    height < 1 ||
    x < 0 ||
    x >= width ||
    y < 0 ||
    y >= height
  ) {
    return
  }

  setMapGridValue(colors, width, x, y, color)
}

export function recycleTLState(layer: MAYBE_MAP) {
  if (!layer) {
    return
  }

  const chars: Y.Map<any> = layer.get('chars')
  const colors: Y.Map<any> = layer.get('colors')

  recycleMapGridValues(chars)
  recycleMapGridValues(colors)
}

export function getTLState(layer: MAYBE_MAP): {
  width: number
  height: number
  dimmed: boolean
  colors: number[]
  chars: number[]
} {
  if (!layer) {
    return { width: 1, height: 1, dimmed: false, colors: [0], chars: [0] }
  }

  const width: number = layer.get('width')
  const height: number = layer.get('height')
  const dimmed: boolean = layer.get('dimmed')
  const chars: Y.Map<any> = layer.get('chars')
  const colors: Y.Map<any> = layer.get('colors')

  return {
    width,
    height,
    dimmed,
    chars: getMapGridValuesArray(chars),
    colors: getMapGridValuesArray(colors),
  }
}

// SPRITES LAYER

type SLSpriteDefault = {
  id?: string
  x: number
  y: number
  char: number
  color: number
}

export function createSLSprite(create: SLSpriteDefault) {
  const id = create.id || createGuid()
  const sprite = new Y.Map<any>()

  sprite.set('id', id)
  sprite.set('x', create.x)
  sprite.set('y', create.y)
  sprite.set('char', create.char)
  sprite.set('color', create.color)

  return { id, sprite }
}

export function setSLSpriteXY(sprite: MAYBE_MAP, x: number, y: number) {
  sprite?.set('x', x)
  sprite?.set('y', y)
}

export function setSLSpriteChar(sprite: MAYBE_MAP, char: number) {
  sprite?.set('char', char)
}

export function setSLSpriteColor(sprite: MAYBE_MAP, color: number) {
  sprite?.set('color', color)
}

export type SLDefault = {
  id?: string
  sprites: SLSpriteDefault[]
}

export function createSL(create: SLDefault) {
  const id = create.id || createGuid()
  const layer = new Y.Map<any>()

  layer.set('id', id)
  layer.set('type', GADGET_LAYER.SPRITES)
  const sprites = new Y.Map<any>()
  create.sprites.map(createSLSprite).forEach((item) => {
    sprites.set(item.id, item.sprite)
  })
  layer.set('sprites', sprites)

  return { id, layer }
}

export function getSLSprites(layer: MAYBE_MAP) {
  return layer?.get('sprites') as MAYBE_MAP
}

export function getSLSpriteIds(layer: MAYBE_MAP) {
  return [...(getSLSprites(layer)?.keys() ?? [])] as string[]
}

export function getSLSprite(layer: MAYBE_MAP, id: string) {
  return getSLSprites(layer)?.get(id) as MAYBE_MAP
}

export type SLSpriteState = SLSpriteDefault & { id: string }

export function getSLState(layer: MAYBE_MAP) {
  if (!layer) {
    return { sprites: [] }
  }

  const sprites: SLSpriteState[] = [
    ...((layer.get('sprites') as MAYBE_MAP)?.values() ?? []),
  ].map((item: MAYBE_MAP) => ({
    id: item?.get('id') ?? '',
    x: item?.get('x') ?? 0,
    y: item?.get('y') ?? 0,
    char: item?.get('char') ?? 0,
    color: item?.get('color') ?? 0,
  }))

  return {
    sprites,
  }
}
