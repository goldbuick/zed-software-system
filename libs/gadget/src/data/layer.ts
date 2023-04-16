import { YKeyValue } from 'y-utility/y-keyvalue'
import * as Y from 'yjs'

import { GADGET_LAYER } from '../types'

import { createKeyValue } from './keyvalue'

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

export function setLDimmed(data: YKeyValue<number>, dimmed: boolean) {
  //
}

// TILES LAYER

type TLDefault = {
  id?: string
  width: number
  height: number
}

export function createTL(create: TLDefault) {
  const { id, data, keyValue } = createKeyValue()

  keyValue.set('keyvalue', id)
  keyValue.set('id', create.id || id)
  keyValue.set('width', create.width)
  keyValue.set('height', create.height)

  const colors = createKeyValue()
  keyValue.set('colors', colors.id)
  keyValue.set('colorsMap', colors.data)

  const codes = createKeyValue()
  keyValue.set('codes', codes.id)
  keyValue.set('codesMap', codes.data)

  return { id, data }
}

export function setTLWidth(data: YKeyValue<number>, width: number) {
  data.set('width', width)
}

export function setTLHeight(data: YKeyValue<number>, width: number) {
  data.set('width', width)
}

export function setTLChar(
  data: YKeyValue<number>,
  x: number,
  y: number,
  char: number,
) {
  // TODO
}

export function setTLColor(
  data: YKeyValue<number>,
  x: number,
  y: number,
  color: number,
) {
  // TODO
}

// OBJECT LAYER

type OLDefault = {
  id?: string
}

export function createOL(create: OLDefault) {
  const { id, data, keyValue } = createKeyValue()

  return { id, data }
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
