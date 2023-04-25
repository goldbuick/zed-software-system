/* eslint-disable @typescript-eslint/no-explicit-any */
import { MAYBE_MAP } from '@zss/system/types'
import { nanoid } from 'nanoid'
import * as Y from 'yjs'

import { GADGET_LAYER } from '../types'

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
export function setLCharSet(layer: MAYBE_MAP, id: string) {
  //
}

export function setLDimmed(layer: MAYBE_MAP, dimmed: boolean) {
  layer?.set('dimmed', dimmed)
}

// TILES LAYER

export type TLDefault = {
  id?: string
  width: number
  height: number
  chars?: number[]
  colors?: number[]
}

function createMapFromArray(values?: number[]) {
  const map = new Y.Map<any>()
  if (!values) {
    return map
  }

  for (let i = 0; i < values.length; ++i) {
    map.set(i.toString(), values[i])
  }
  return map
}

export function createTL(layers: MAYBE_MAP, create: TLDefault) {
  if (!layers) {
    return
  }

  const id = create.id || nanoid()
  const layer = new Y.Map<any>()

  layer.set('id', id)
  layer.set('type', GADGET_LAYER.TILES)
  layer.set('width', create.width)
  layer.set('height', create.height)
  layer.set('chars', createMapFromArray(create.chars))
  layer.set('colors', createMapFromArray(create.colors))

  layers.set(id, layer)
  return layer
}

export function setTLSize(layer: MAYBE_MAP, width: number, height: number) {
  if (!layer) {
    return
  }

  layer.set('width', width)
  layer.set('height', height)
  // do we do shit with chars & colors ??
  // essentially do a remap ?
}

export function setTLChar(
  layer: MAYBE_MAP,
  x: number,
  y: number,
  char: number,
) {
  if (!layer) {
    return
  }

  const width: number = layer.get('width')
  const height: number = layer.get('height')
  const chars: Y.Map<any> = layer.get('chars')
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
  chars.set((x + y * width).toString(), char)
}

export function setTLColor(
  layer: MAYBE_MAP,
  x: number,
  y: number,
  color: number,
) {
  if (!layer) {
    return
  }

  const width: number = layer.get('width')
  const height: number = layer.get('height')
  const colors: Y.Map<any> = layer.get('colors')
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
  colors.set((x + y * width).toString(), color)
}

// SPRITES LAYER

export type SLDefault = {
  id?: string
}

export function createSL(layers: MAYBE_MAP, create: SLDefault) {
  if (!layers) {
    return
  }

  const id = create.id || nanoid()
  const layer = new Y.Map<any>()

  layer.set('id', id)
  layer.set('type', GADGET_LAYER.SPRITES)
  layer.set('sprites', new Y.Map<any>())

  layers.set(id, layer)
  return layer
}

type SLSpriteDefault = {
  id?: string
  x: number
  y: number
  char: number
  color: number
}

export function createSLSprite(layer: MAYBE_MAP, create: SLSpriteDefault) {
  if (!layer) {
    return
  }

  const id = create.id || nanoid()
  const sprite = new Y.Map<any>()

  sprite.set('id', id)
  sprite.set('x', create.x)
  sprite.set('y', create.y)
  sprite.set('char', create.char)
  sprite.set('color', create.color)

  layer.set(id, sprite)
  return sprite
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
