/* eslint-disable @typescript-eslint/no-explicit-any */
import { MAYBE_MAP } from '@zss/system/types'
import { nanoid } from 'nanoid'
import * as Y from 'yjs'

type GadgetDefault = {
  id?: string
}

export function createGadget(doc: Y.Doc, create: GadgetDefault) {
  const id = create.id || nanoid()

  const gadget = new Y.Map<any>()
  gadget.set('id', id)
  gadget.set('layers', new Y.Map<any>())

  // add to document
  const gadgets = doc.getMap('gadgets')
  gadgets.set(id, gadget)

  return gadget
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
