import { useObservable } from '@zss/yjs/binding'
import { getValueFromMap } from '@zss/yjs/mapping'
import { useState } from 'react'

import {
  GUI_ELEMENT,
  getGLElement,
  getGLElementIds,
  getGLElementType,
  getGLElements,
} from '../data/gui'

import { Button } from './gui/button'
import { LayoutCursor } from './gui/context'
import { Label } from './gui/label'
import { TextEdit } from './gui/textedit'
import { LayerProps } from './types'

export function Gui({ layer }: LayerProps) {
  const [elementIds, setElementIds] = useState<string[]>([])

  useObservable(getGLElements(layer), () =>
    setElementIds(getGLElementIds(layer)),
  )

  const maxWidth = getValueFromMap(layer, 'maxWidth', 0)
  return (
    <LayoutCursor maxWidth={maxWidth}>
      {elementIds.map((id) => {
        const element = getGLElement(layer, id)
        return (
          <group key={id} position-z={1}>
            {(() => {
              switch (getGLElementType(element)) {
                case GUI_ELEMENT.LABEL:
                  return <Label element={element} />
                case GUI_ELEMENT.BUTTON:
                  return <Button element={element} />
                case GUI_ELEMENT.TEXT_EDIT:
                  return <TextEdit element={element} />
                default:
                  return null
              }
            })()}
          </group>
        )
      })}
    </LayoutCursor>
  )
}
