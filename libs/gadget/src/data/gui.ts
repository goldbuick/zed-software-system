/* eslint-disable @typescript-eslint/no-explicit-any */
import { createGuid } from '@zss/system/mapping/guid'
import * as Y from 'yjs'

import { GADGET_LAYER } from './layer'

export type GLDefault = {
  id?: string
}

export function createGL(create: GLDefault) {
  const id = create.id || createGuid()
  const layer = new Y.Map<any>()

  layer.set('id', id)
  layer.set('type', GADGET_LAYER.GUI)

  return { id, layer }
}
