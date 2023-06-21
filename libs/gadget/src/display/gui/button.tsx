import { useState } from 'react'

import { GUI_ELEMENT } from '../../data/gui'
import { ElementProps } from '../types'

import { MoveCursor } from './context'
import { theme, Draw, drawString } from './draw'
import { ElementState } from './elementstate'

export function Button({ element }: ElementProps) {
  const [elementY, setElementY] = useState(0)
  return (
    <ElementState element={element}>
      {(state) => {
        if (state?.type !== GUI_ELEMENT.BUTTON) {
          return null
        }

        const width = state.label.length + 2
        const height = 1
        const count = width * height

        const even = elementY % 2 === 0
        const chars = drawString(` ${state.label.toUpperCase()} `)
        const colors = Array(count).fill(
          even ? theme.button.even.text : theme.button.odd.text,
        )
        const bgs = Array(count).fill(
          even ? theme.button.even.color : theme.button.odd.color,
        )

        return (
          <MoveCursor width={width + 1} height={height} onSetY={setElementY}>
            <Draw
              key={count}
              width={width}
              height={height}
              chars={chars}
              colors={colors}
              bgs={bgs}
            ></Draw>
          </MoveCursor>
        )
      }}
    </ElementState>
  )
}
