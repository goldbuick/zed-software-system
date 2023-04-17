import { YKeyValue } from 'y-utility/y-keyvalue'

import { GADGET_LAYER } from '../types'

import { createKeyValuePair, getKeyValuePair } from './keyvalue'

/*
 * there are different kinds of layers
 * tiles (xy coords that match width & height of gadget)
 * objects (indivial outlined chars with xy coords with animated transitions)
 * input elements (button, radio button, text input, code edit, with animated transitions)
 */

// COMMON for all layers

export function setLType(data: YKeyValue<GADGET_LAYER>, layer: GADGET_LAYER) {
  data.set('type', layer)
}

export function getLType(data: YKeyValue<GADGET_LAYER>) {
  return data.get('type') || GADGET_LAYER.BLANK
}

// COMMON for TILES & OBJECT LAYERS
export function setLCharSet(data: YKeyValue<number>, id: string) {
  //
}

export function setLDimmed(data: YKeyValue<boolean>, dimmed: boolean) {
  data.set('dimmed', dimmed)
}

// TILES LAYER

type TLDefault = {
  id?: string
  width: number
  height: number
}

export function createTL(create: TLDefault) {
  const { id, pair, keyValue } = createKeyValuePair()

  keyValue.set('id', create.id || id)
  keyValue.set('width', create.width)
  keyValue.set('height', create.height)
  keyValue.set('chars', createKeyValuePair().pair)
  keyValue.set('colors', createKeyValuePair().pair)

  return pair
}

export function setTLSize(
  data: YKeyValue<number>,
  width: number,
  height: number,
) {
  data.set('width', width)
  data.set('height', height)
  // do we do shit with chars & colors ??
  // essentially do a remap ?
}

export function setTLChar(
  data: YKeyValue<any>,
  x: number,
  y: number,
  char: number,
) {
  const width = data.get('width') ?? 0
  const height = data.get('height') ?? 0
  const chars = getKeyValuePair(data.get('chars'))
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
  data: YKeyValue<any>,
  x: number,
  y: number,
  color: number,
) {
  const width = data.get('width') ?? 0
  const height = data.get('height') ?? 0
  const colors = getKeyValuePair(data.get('colors'))
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

// OBJECT LAYER

type OLDefault = {
  id?: string
}

export function createOL(create: OLDefault) {
  const { id, pair, keyValue } = createKeyValuePair()

  return pair
}

type OLObjectDefault = {
  id?: string
}

export function createOLObject(
  data: YKeyValue<number>,
  create?: OLObjectDefault,
) {
  // TODO
}

export function destroyOLObject(data: YKeyValue<number>, id: string) {
  //
}

export function setOLObjectXY(
  data: YKeyValue<number>,
  id: string,
  x: number,
  y: number,
) {
  // TODO
}

export function setOLObjectChar(
  data: YKeyValue<number>,
  id: string,
  char: number,
) {
  // TODO
}

export function setOLObjectColor(
  data: YKeyValue<number>,
  id: string,
  color: number,
) {
  // TODO
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
