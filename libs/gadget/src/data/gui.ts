/* eslint-disable @typescript-eslint/no-explicit-any */
import { createGuid } from '@zss/system/mapping/guid'
import { getValueFromMap } from '@zss/yjs/mapping'
import { MAYBE_MAP } from '@zss/yjs/types'
import * as Y from 'yjs'

import { GADGET_LAYER } from './layer'

export enum GUI_ELEMENT {
  BLANK,
  // labels
  LABEL,
  // interactables
  BUTTON,
  // content
  TEXT_EDIT,
  // layout
  FILL,
  EOL,
  // paging ?
}

type GLElementCommon = {
  id?: string
}

type GLBlankDefault = GLElementCommon & {
  type: GUI_ELEMENT.BLANK
}

type GLLabelDefault = GLElementCommon & {
  type: GUI_ELEMENT.LABEL
  label: string
}

type GLButtonDefault = GLElementCommon & {
  type: GUI_ELEMENT.BUTTON
  label: string
}

export function setGLButtonPress(button: MAYBE_MAP) {
  //
}

type GLTextEditDefault = GLElementCommon & {
  type: GUI_ELEMENT.TEXT_EDIT
  value: string
}

type GLFillDefault = GLElementCommon & {
  type: GUI_ELEMENT.FILL
}

type GLEOLDefault = GLElementCommon & {
  type: GUI_ELEMENT.EOL
}

type GLElementDefault =
  | GLBlankDefault
  | GLLabelDefault
  | GLButtonDefault
  | GLTextEditDefault
  | GLFillDefault
  | GLEOLDefault

export function createGLElement(create: GLElementDefault) {
  const id = create.id || createGuid()
  const element = new Y.Map<any>()

  element.set('type', create.type)
  switch (create.type) {
    case GUI_ELEMENT.BUTTON:
      element.set('label', create.label)
      element.set('pressed', new Y.Map<boolean>())
      break
    case GUI_ELEMENT.TEXT_EDIT:
      element.set('value', create.value)
      break
    default:
      break
  }

  return { id, element }
}

export function getGLElementType(element: MAYBE_MAP) {
  return (element?.get('type') as GUI_ELEMENT) ?? GUI_ELEMENT.BLANK
}

export type GLDefault = {
  id?: string
  maxWidth: number
  elements: GLElementDefault[]
}

export function createGL(create: GLDefault) {
  const id = create.id || createGuid()
  const layer = new Y.Map<any>()

  layer.set('id', id)
  layer.set('type', GADGET_LAYER.GUI)
  layer.set('maxWidth', create.maxWidth)

  const elements = new Y.Map<any>()
  create.elements.map(createGLElement).forEach((item) => {
    elements.set(item.id, item.element)
  })
  layer.set('elements', elements)

  return { id, layer }
}

export function getGLElements(gui: MAYBE_MAP) {
  return gui?.get('elements')
}

export function getGLElementIds(gui: MAYBE_MAP) {
  const elements = getGLElements(gui)
  if (!elements) {
    return []
  }
  return [...elements.keys()]
}

export function getGLElement(gui: MAYBE_MAP, id: string): MAYBE_MAP {
  const elements = getGLElements(gui)
  if (!elements) {
    return undefined
  }
  return elements.get(id)
}

export type GLElementState = GLElementDefault & { id: string }

export function getGLElementState(element: MAYBE_MAP): GLElementState {
  const id = getValueFromMap(element, 'id', '')
  const type = getValueFromMap(
    element,
    'type',
    GUI_ELEMENT.BLANK as GUI_ELEMENT,
  )

  switch (type) {
    case GUI_ELEMENT.BUTTON:
      return {
        id,
        type: GUI_ELEMENT.BUTTON,
        label: getValueFromMap(element, 'label', ''),
      }
    case GUI_ELEMENT.TEXT_EDIT:
      return {
        id,
        type: GUI_ELEMENT.TEXT_EDIT,
        value: getValueFromMap(element, 'value', ''),
      }
    default:
      return {
        id,
        type: GUI_ELEMENT.BLANK,
      }
  }
}
