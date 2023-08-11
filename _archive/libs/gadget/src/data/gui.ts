/* eslint-disable @typescript-eslint/no-explicit-any */
import { createGuid } from '@zss/system/mapping/guid'
import { getValueFromMap } from '@zss/yjs/mapping'
import { MAYBE_TEXT, MAYBE_MAP } from '@zss/yjs/types'
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
  width: number
  label: string
}

type GLButtonDefault = GLElementCommon & {
  type: GUI_ELEMENT.BUTTON
  label: string
  message: string
}

export function setGLButtonPress(
  button: MAYBE_MAP,
  id: string,
  value: boolean,
) {
  const press: MAYBE_MAP = button?.get('press')
  press?.set(id, value)
}

type GLTextEditDefault = GLElementCommon & {
  type: GUI_ELEMENT.TEXT_EDIT
  width: number
  value: string
}

export function getTextFromGLTextEdit(textEdit: MAYBE_MAP): MAYBE_TEXT {
  return textEdit?.get('value')
}

type GLEOLDefault = GLElementCommon & {
  type: GUI_ELEMENT.EOL
}

type GLElementDefault =
  | GLBlankDefault
  | GLLabelDefault
  | GLButtonDefault
  | GLTextEditDefault
  | GLEOLDefault

export function createGLElement(create: GLElementDefault) {
  const id = create.id || createGuid()
  const element = new Y.Map<any>()

  element.set('type', create.type)
  switch (create.type) {
    case GUI_ELEMENT.LABEL:
      element.set('width', create.width)
      element.set('label', create.label)
      break
    case GUI_ELEMENT.BUTTON:
      element.set('label', create.label)
      element.set('message', create.message)
      element.set('press', new Y.Map<any>())
      break
    case GUI_ELEMENT.TEXT_EDIT:
      element.set('width', create.width)
      element.set('value', new Y.Text(create.value))
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

export type GLBlankState = {
  type: GUI_ELEMENT.BLANK
}
export type GLLabelState = {
  type: GUI_ELEMENT.LABEL
  width: number
  label: string
}
export type GLButtonState = GLButtonDefault & {
  press: Record<string, boolean>
}
export type GLTextEditState = {
  type: GUI_ELEMENT.TEXT_EDIT
  width: number
  value: string
}
export type GLEOLState = {
  type: GUI_ELEMENT.EOL
}

export type GLElementAll =
  | GLBlankState
  | GLLabelState
  | GLButtonState
  | GLTextEditState
  | GLEOLState

export type GLElementState = GLElementAll & { id: string }

export function getGLElementState(element: MAYBE_MAP): GLElementState {
  const id = getValueFromMap(element, 'id', '')
  const type = getValueFromMap(
    element,
    'type',
    GUI_ELEMENT.BLANK as GUI_ELEMENT,
  )

  switch (type) {
    case GUI_ELEMENT.LABEL:
      return {
        id,
        type,
        width: getValueFromMap(element, 'width', 0),
        label: getValueFromMap(element, 'label', ''),
      }
    case GUI_ELEMENT.BUTTON: {
      const press: MAYBE_MAP = element?.get('press')
      return {
        id,
        type,
        press: press ? press.toJSON() : {},
        message: getValueFromMap(element, 'message', ''),
        label: getValueFromMap(element, 'label', ''),
      }
    }
    case GUI_ELEMENT.TEXT_EDIT:
      return {
        id,
        type,
        width: getValueFromMap(element, 'width', 0),
        value: (element?.get('value') as MAYBE_TEXT)?.toJSON() ?? '',
      }
    default:
      return {
        id,
        type: GUI_ELEMENT.BLANK,
      }
  }
}
