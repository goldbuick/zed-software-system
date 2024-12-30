/* eslint-disable react/no-unknown-property */
import nipplejs from 'nipplejs'
import { useEffect, useRef } from 'react'
import { RUNTIME } from 'zss/config'
import { tape_terminal_open, vm_input } from 'zss/device/api'
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
      zone: document.getElementById('frame') ?? undefined,
      color: '#00A',
      mode: 'dynamic',
      dataOnly: true,
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

    function handledirevt(evt: any) {
      switch (evt.type) {
        case 'removed':
          break
        case 'dir:up':
          vm_input('touchui', INPUT.MOVE_UP, 0, player)
          break
        case 'dir:down':
          vm_input('touchui', INPUT.MOVE_DOWN, 0, player)
          break
        case 'dir:left':
          vm_input('touchui', INPUT.MOVE_LEFT, 0, player)
          break
        case 'dir:right':
          vm_input('touchui', INPUT.MOVE_RIGHT, 0, player)
          break
      }
    }

    current.on('dir:up', handledirevt)
    current.on('dir:down', handledirevt)
    current.on('dir:left', handledirevt)
    current.on('dir:right', handledirevt)
    return () => {
      current.off('dir:up', handledirevt)
      current.off('dir:down', handledirevt)
      current.off('dir:left', handledirevt)
      current.off('dir:right', handledirevt)
    }
  }, [player])

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
              vm_input('touchui', INPUT.MENU_BUTTON, 0, player)
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
              vm_input('touchui', INPUT.OK_BUTTON, 0, player)
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
              vm_input('touchui', INPUT.CANCEL_BUTTON, 0, player)
            }}
          />
        </group>
      </group>
    </TilesData>
  )
}
