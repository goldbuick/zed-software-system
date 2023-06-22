import { GUI_ELEMENT } from '../../../data/gui'
import { ElementProps } from '../../types'
import { MoveCursor } from '../context'
import { theme, Draw, drawStringPadEnd } from '../draw'
import { ElementState } from '../elementstate'

export function Label({ element }: ElementProps) {
  return (
    <ElementState element={element}>
      {(state) => {
        if (state?.type !== GUI_ELEMENT.LABEL) {
          return null
        }

        const width = Math.max(1, state.width)
        const height = 1
        const count = width * height

        const chars = drawStringPadEnd(state.label, width)
        const colors = Array(count).fill(theme.label.text)
        const bgs = Array(count).fill(theme.panel.color)

        return (
          <MoveCursor width={width + 1} height={height}>
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
