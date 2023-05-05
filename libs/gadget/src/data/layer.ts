/* eslint-disable @typescript-eslint/no-explicit-any */
import { createMapGrid, setMapGridValue } from '@zss/system/mapping/yjs'
import { MAYBE_MAP } from '@zss/system/types'
import { nanoid } from 'nanoid'
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
  const id = create.id || nanoid()
  const layer = new Y.Map<any>()

  layer.set('id', id)
  layer.set('type', GADGET_LAYER.TILES)
  layer.set('width', create.width)
  layer.set('height', create.height)
  layer.set('chars', createMapGrid(create.width, create.height, create.chars))
  layer.set('colors', createMapGrid(create.width, create.height, create.colors))

  return { id, layer }
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
  setMapGridValue(chars, width, x, y, char)
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

  setMapGridValue(colors, width, x, y, color)
}

// SPRITES LAYER

export type SLDefault = {
  id?: string
}

export function createSL(create: SLDefault) {
  const id = create.id || nanoid()
  const layer = new Y.Map<any>()

  layer.set('id', id)
  layer.set('type', GADGET_LAYER.SPRITES)
  layer.set('sprites', new Y.Map<any>())

  return { id, layer }
}

type SLSpriteDefault = {
  id?: string
  x: number
  y: number
  char: number
  color: number
}

export function createSLSprite(create: SLSpriteDefault) {
  const id = create.id || nanoid()
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
