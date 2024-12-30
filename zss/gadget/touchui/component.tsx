/* eslint-disable react/no-unknown-property */
import nipplejs from 'nipplejs'
import { useEffect, useRef } from 'react'
import { RUNTIME } from 'zss/config'
import { tape_terminal_open } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { ispresent } from 'zss/mapping/types'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
  textformatedges,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { Clickable } from '../clickable'
import { INPUT } from '../data/types'
import { ShadeBoxDither } from '../framed/dither'
import { useTiles } from '../hooks'
import { userinputinvoke } from '../userinput'
import { useScreenSize } from '../userscreen'
import { TilesData, TilesRender } from '../usetiles'

export type TouchUIProps = {
  width: number
  height: number
}

export function TouchUI({ width, height }: TouchUIProps) {
  const screensize = useScreenSize()
  const sticksref = useRef(
    nipplejs.create({
      color: '#00A',
      mode: 'dynamic',
      multitouch: true,
      dynamicPage: true,
      maxNumberOfNipples: 2,
    }),
  )
  const player = registerreadplayer()

  const FG = COLOR.PURPLE
  const BG = COLOR.ONCLEAR
  const store = useTiles(width, height, 0, FG, BG)
  const context: WRITE_TEXT_CONTEXT = {
    ...createwritetextcontext(width, height, FG, BG),
    ...store.getState(),
  }

  const BUTTON_WIDTH = 5
  const BUTTON_HEIGHT = 3

  useEffect(() => {
    const { current } = sticksref
    if (!ispresent(current)) {
      return
    }

    function handledirevt(evt: any, data: any) {
      const mods = {
        alt: false,
        ctrl: false,
        shift: data.id > 0,
      }
      console.info('handledirevt', mods)
      switch (evt.type) {
        case 'removed':
          data.off('all done')
          break
        case 'dir:up':
          userinputinvoke(INPUT.MOVE_UP, mods)
          break
        case 'dir:down':
          userinputinvoke(INPUT.MOVE_DOWN, mods)
          break
        case 'dir:right':
          userinputinvoke(INPUT.MOVE_RIGHT, mods)
          break
        case 'dir:left':
          userinputinvoke(INPUT.MOVE_LEFT, mods)
          break
      }
    }

    current.on('dir', handledirevt)
    current.on('removed', handledirevt)
    return () => {
      current.off('dir', handledirevt)
      current.off('removed', handledirevt)
    }
  }, [])

  // bail on odd states
  if (screensize.cols < 10 || screensize.rows < 10) {
    return null
  }

  // render ui
  textformatedges(1, 1, width - 2, height - 2, context)

  // action button targets
  context.y = 3
  for (let i = 0; i < 3; ++i) {
    context.x = context.active.leftedge = 1
    tokenizeandwritetextformat(`$BLUE$177$177$177$177$177`, context, false)
    context.x = context.active.leftedge = width - 7
    tokenizeandwritetextformat(`$PURPLE$177$177$177$177$177`, context, false)
    ++context.y
  }

  context.y = height - 5
  for (let i = 0; i < 3; ++i) {
    context.x = context.active.leftedge = 1
    tokenizeandwritetextformat(`$GREEN$177$177$177$177$177`, context, false)
    context.x = context.active.leftedge = width - 7
    tokenizeandwritetextformat(`$RED$177$177$177$177$177`, context, false)
    ++context.y
  }

  return (
    <TilesData store={store}>
      <group position={[0, 0, 999]}>
        <ShadeBoxDither
          width={width}
          height={height}
          top={3}
          left={0}
          right={5}
          bottom={height - 2}
        />
        <ShadeBoxDither
          width={width}
          height={height}
          top={5}
          left={width - 6}
          right={width - 1}
          bottom={height - 2}
        />
        <TilesRender width={width} height={height} />
        <group
          position={[
            1 * RUNTIME.DRAW_CHAR_WIDTH(),
            3 * RUNTIME.DRAW_CHAR_HEIGHT(),
            0,
          ]}
        >
          <Clickable
            blocking
            width={BUTTON_WIDTH}
            height={BUTTON_HEIGHT}
            onClick={() => {
              // top-left button
              tape_terminal_open('touchui', player)
            }}
          />
        </group>
        <group
          position={[
            (width - 7) * RUNTIME.DRAW_CHAR_WIDTH(),
            3 * RUNTIME.DRAW_CHAR_HEIGHT(),
            0,
          ]}
        >
          <Clickable
            blocking
            width={BUTTON_WIDTH}
            height={BUTTON_HEIGHT}
            onClick={() => {
              // top-right button
              userinputinvoke(INPUT.MENU_BUTTON, {
                alt: false,
                ctrl: false,
                shift: false,
              })
            }}
          />
        </group>
        <group
          position={[
            1 * RUNTIME.DRAW_CHAR_WIDTH(),
            (height - 5) * RUNTIME.DRAW_CHAR_HEIGHT(),
            0,
          ]}
        >
          <Clickable
            blocking
            width={BUTTON_WIDTH}
            height={BUTTON_HEIGHT}
            onClick={() => {
              // bottom-left button
              userinputinvoke(INPUT.OK_BUTTON, {
                alt: false,
                ctrl: false,
                shift: false,
              })
            }}
          />
        </group>
        <group
          position={[
            (width - 7) * RUNTIME.DRAW_CHAR_WIDTH(),
            (height - 5) * RUNTIME.DRAW_CHAR_HEIGHT(),
            0,
          ]}
        >
          <Clickable
            blocking
            width={BUTTON_WIDTH}
            height={BUTTON_HEIGHT}
            onClick={() => {
              // bottom-right button
              userinputinvoke(INPUT.CANCEL_BUTTON, {
                alt: false,
                ctrl: false,
                shift: false,
              })
            }}
          />
        </group>
      </group>
    </TilesData>
  )
}
