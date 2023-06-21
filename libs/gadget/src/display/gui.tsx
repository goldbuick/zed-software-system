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
import { LayoutCursor, MoveCursor } from './gui/context'
import { Draw, theme } from './gui/draw'
import { Label } from './gui/label'
import { TextEdit } from './gui/textedit'
import { LayerProps } from './types'

export function Gui({ layer }: LayerProps) {
  const [width, setWidth] = useState(1)
  const [height, setHeight] = useState(1)
  const [elementIds, setElementIds] = useState<string[]>([])

  useObservable(getGLElements(layer), () =>
    setElementIds(getGLElementIds(layer)),
  )

  const maxWidth = getValueFromMap(layer, 'maxWidth', 0)
  const count = width * height
  const chars = Array(count).fill(32)
  const colors = Array(count).fill(theme.empty)
  const bgs = Array(count).fill(theme.panel.color)

  return (
    <LayoutCursor
      maxWidth={maxWidth}
      onSize={(newWidth, newHeight) => {
        setWidth(newWidth)
        setHeight(newHeight)
      }}
    >
      <Draw
        width={width}
        height={height}
        chars={chars}
        colors={colors}
        bgs={bgs}
      />
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
                case GUI_ELEMENT.EOL:
                  return <MoveCursor eol />
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
