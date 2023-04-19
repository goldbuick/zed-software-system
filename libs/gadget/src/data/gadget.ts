/* eslint-disable @typescript-eslint/no-explicit-any */
import { nanoid } from 'nanoid'
import * as Y from 'yjs'

import { GADGET_LAYER } from '../types'

import { SLDefault, TLDefault, createSL, createTL, getLId } from './layer'

type GadgetDefault = {
  id?: string
}

export function createGadget(doc: Y.Doc, create: GadgetDefault) {
  const gadget = new Y.Map<any>()

  gadget.set('id', create.id || nanoid())
  gadget.set('layers', new Y.Map<any>())

  // add to document
  const gadgets = doc.getMap('gadgets')
  gadgets.set(gadget.get('id'), gadget)

  return gadget
}

export function destroyGadget(gadget: Y.Map<any>) {
  const layers: Y.Map<any> = gadget.get('layers')
  layers.forEach((value, key) => {
    destroyGL(gadget, key)
  })
}

type LayerDefaults = {
  [GADGET_LAYER.BLANK]: void
  [GADGET_LAYER.TILES]: TLDefault
  [GADGET_LAYER.SPRITES]: SLDefault
  [GADGET_LAYER.GUI]: void
}

const layerCreate = {
  [GADGET_LAYER.BLANK]: undefined,
  [GADGET_LAYER.TILES]: createTL,
  [GADGET_LAYER.SPRITES]: createSL,
  [GADGET_LAYER.GUI]: undefined,
}

export type LayerCreate<T extends keyof LayerDefaults> = LayerDefaults[T]

export function createGL<T extends keyof LayerDefaults>(
  gadget: Y.Map<any>,
  type: T,
  create: LayerCreate<T>,
) {
  const func = layerCreate[type]
  if (!func || !create) {
    return
  }

  // @ts-expect-error i tried
  const layer = func(create)

  gadget.get('layers').set(getLId(layer), layer)
}

export function destroyGL(gadget: Y.Map<any>, id: string) {
  const layers: Y.Map<any> = gadget.get('layers')
  if (!layers) {
    return
  }
  layers.delete(id)
}
