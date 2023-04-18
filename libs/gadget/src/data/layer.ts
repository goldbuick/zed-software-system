import { nanoid } from 'nanoid'
import * as Y from 'yjs'

import { GADGET_LAYER } from '../types'

import {
  createKeyValuePair,
  destroyKeyValuePair,
  getKeyValuePair,
} from './keyvalue'

/*
 * there are different kinds of layers
 * tiles (xy coords that match width & height of gadget)
 * objects (indivial outlined chars with xy coords with animated transitions)
 * input elements (button, radio button, text input, code edit, with animated transitions)
 */

// COMMON for all layers

export function getLId(layer: Y.Map<any>): string {
  return layer.get('id') || ''
}

export function getLType(layer: Y.Map<any>): GADGET_LAYER {
  return layer.get('type') || GADGET_LAYER.BLANK
}

// COMMON for TILES & SPRITES LAYERS
export function setLCharSet(layer: Y.Map<number>, id: string) {
  //
}

export function setLDimmed(layer: Y.Map<boolean>, dimmed: boolean) {
  layer.set('dimmed', dimmed)
}

// TILES LAYER

export type TLDefault = {
  id?: string
  width: number
  height: number
}

export function createTL(create: TLDefault) {
  const layer = new Y.Map<any>()

  layer.set('id', create.id || nanoid())
  layer.set('type', GADGET_LAYER.TILES)
  layer.set('width', create.width)
  layer.set('height', create.height)
  layer.set('chars', createKeyValuePair().pair)
  layer.set('colors', createKeyValuePair().pair)

  return layer
}

export function destroyTL(layer: Y.Map<any>) {
  destroyKeyValuePair(layer.get('chars'))
  destroyKeyValuePair(layer.get('colors'))
}

export function setTLSize(layer: Y.Map<any>, width: number, height: number) {
  layer.set('width', width)
  layer.set('height', height)
  // do we do shit with chars & colors ??
  // essentially do a remap ?
}

export function setTLChar(
  layer: Y.Map<any>,
  x: number,
  y: number,
  char: number,
) {
  const width: number = layer.get('width')
  const height: number = layer.get('height')
  const chars = getKeyValuePair(layer.get('chars'))
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
  chars.set(`${x + y * width}`, char)
}

export function setTLColor(
  layer: Y.Map<any>,
  x: number,
  y: number,
  color: number,
) {
  const width: number = layer.get('width')
  const height: number = layer.get('height')
  const colors = getKeyValuePair(layer.get('colors'))
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
  colors.set(`${x + y * width}`, color)
}

// SPRITES LAYER

export type SLDefault = {
  id?: string
}

export function createSL(create: SLDefault) {
  const layer = new Y.Map<any>()

  layer.set('id', create.id || nanoid())
  layer.set('type', GADGET_LAYER.SPRITES)
  layer.set('sprites', new Y.Map<any>())

  return layer
}

type SLSpriteDefault = {
  id?: string
  x: number
  y: number
  char: number
  color: number
}

export function createSLSprite(create: SLSpriteDefault) {
  const layer = new Y.Map<any>()

  layer.set('id', create.id || nanoid())
  layer.set('x', create.x)
  layer.set('y', create.y)
  layer.set('char', create.char)
  layer.set('color', create.color)

  return layer
}

export function setSLSpriteXY(sprite: Y.Map<any>, x: number, y: number) {
  sprite.set('x', x)
  sprite.set('y', y)
}

export function setSLSpriteChar(sprite: Y.Map<any>, char: number) {
  sprite.set('char', char)
}

export function setSLSpriteColor(sprite: Y.Map<any>, color: number) {
  sprite.set('color', color)
}

// TODO set animation / deco state etc..

// UI LAYER

// width?: number
// height?: number
// chars?: (Char | undefined | null)[]
// dimmed?: boolean // puts this at half opacity
// outline?: boolean // objects use outlined chars
// map: CanvasTexture
// alt: CanvasTexture
