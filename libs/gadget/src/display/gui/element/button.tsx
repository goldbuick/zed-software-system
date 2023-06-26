import React from 'react'

import { GUI_ELEMENT } from '../../../data/gui'
import { ElementProps } from '../../types'
import { Clickable } from '../clickable'
import { MoveCursorRender } from '../context'
import { theme, Draw, drawString } from '../draw'
import { ElementState } from '../elementstate'

export function Button({ element }: ElementProps) {
  return (
    <ElementState element={element}>
      {(state) => {
        if (state?.type !== GUI_ELEMENT.BUTTON) {
          return null
        }

        const width = state.label.length + 2
        const height = 1
        const count = width * height

        console.info(state)

        return (
          <MoveCursorRender width={width + 1} height={height}>
            {({ even }) => {
              const chars = drawString(` ${state.label.toUpperCase()} `)
              const colors = Array(count).fill(
                even ? theme.button.even.text : theme.button.odd.text,
              )
              const bgs = Array(count).fill(
                even ? theme.button.even.color : theme.button.odd.color,
              )

              return (
                <React.Fragment key={count}>
                  <Draw
                    key={count}
                    width={width}
                    height={height}
                    chars={chars}
                    colors={colors}
                    bgs={bgs}
                  />
                  <Clickable
                    width={width}
                    height={height}
                    onClick={() => {
                      console.info('hi')
                    }}
                  />
                </React.Fragment>
              )
            }}
          </MoveCursorRender>
        )
      }}
    </ElementState>
  )
}
