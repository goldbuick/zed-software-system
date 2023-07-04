import React from 'react'

import { GUI_ELEMENT, setGLButtonPress } from '../../../data/gui'
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

        return (
          <MoveCursorRender width={width + 1} height={height}>
            {({ even }) => {
              const pressed = Object.values(state.press).some((v) => v)
              const chars = drawString(` ${state.label.toUpperCase()} `)
              const colors = Array(count).fill(
                pressed
                  ? theme.button.pressed
                  : even
                  ? theme.button.even.text
                  : theme.button.odd.text,
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
                      console.info(state.message)
                      // where does this event go ??
                      // message to the sim board ?
                      // there should be a gadget context
                      // that can dispatch message strings
                      // I think we have to create overlaps in address spaces ie: hubs
                      // boards could be that overlap?
                      // when you create a gadget it needs a board id to work with
                      // and we need an address space for boards ?
                      // like "sim" is the address space
                      // and you can load code pages
                      // messages are selectors
                      // [var]:message or message
                      // all, others, player are special vars
                      /*
                      gadget -> SOMETHING -> board
                      so codepage + board
                      the thing is that it's interchangable 
                      edit board
                      play board
                      modalities for code pages
                      okay so really we want to run a code page
                      and the code page has access to different things it
                      can use to construct software
                      */
                    }}
                    onPressed={(pressed) => {
                      setGLButtonPress(element, 'zed', pressed)
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
