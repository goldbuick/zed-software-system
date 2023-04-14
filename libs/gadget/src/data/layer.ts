import { YKeyValue } from 'y-utility/y-keyvalue'
import * as Y from 'yjs'

import { CHARS, GADGET_LAYER } from '../types'

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

function createChar() {
  // thing
}

type TLDefault = {
  id?: string
  width: number
  height: number
  chars?: CHARS
}

export function createTL(create: TLDefault) {
  const { id, data, keyValue } = createKeyValue()

  keyValue.set('id', create.id || id)
  keyValue.set('source', id)
  keyValue.set('width', create.width)
  keyValue.set('height', create.height)

  const size = create.width * create.height
  // if (chars) {
  // map them through createChar()
  // } else {
  // we can run createChar with defaults
  // }

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

type OLObjectDefault = {
  id?: string
  x?: number
  y?: number
  char?: number
  color?: number
  dimmed?: boolean
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
