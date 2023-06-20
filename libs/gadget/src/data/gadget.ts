/* eslint-disable @typescript-eslint/no-explicit-any */
import { createGuid } from '@zss/system/mapping/guid'
import { MAYBE_MAP } from '@zss/yjs/types'
import * as Y from 'yjs'

type GadgetDefault = {
  id?: string
}

export function createGadget(create: GadgetDefault) {
  const id = create.id || createGuid()

  const gadget = new Y.Map<any>()
  gadget.set('id', id)
  gadget.set('layers', new Y.Map<any>())

  return { id, gadget }
}

export function destroyGadget(gadget: MAYBE_MAP) {
  const layers: MAYBE_MAP = gadget?.get('layers')
  layers?.forEach((value, key) => {
    destroyGL(gadget, key)
  })
}

export function getGLs(gadget: MAYBE_MAP): MAYBE_MAP {
  return gadget?.get('layers')
}

export function getGLids(gadget: MAYBE_MAP): string[] {
  const layers = getGLs(gadget)
  if (!layers) {
    return []
  }
  return [...layers.keys()]
}

export function addGL(gadget: MAYBE_MAP, id: string, layer: MAYBE_MAP) {
  const layers = getGLs(gadget)
  layers?.set(id, layer)
}

export function getGL(gadget: MAYBE_MAP, id: string): MAYBE_MAP {
  const layers = getGLs(gadget)
  if (!layers) {
    return undefined
  }
  return layers.get(id)
}

export function destroyGL(gadget: MAYBE_MAP, id: string) {
  const layers = getGLs(gadget)
  if (!layers) {
    return
  }
  layers.delete(id)
}
