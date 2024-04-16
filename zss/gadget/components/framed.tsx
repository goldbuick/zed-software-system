import { useFrame } from '@react-three/fiber'
import React, { useRef } from 'react'
import { Group, Vector2 } from 'three'
import {
  DRAW_CHAR_HEIGHT,
  DRAW_CHAR_WIDTH,
  INPUT,
  INPUT_ALT,
  INPUT_CTRL,
  INPUT_SHIFT,
  LAYER,
  LAYER_TYPE,
  layersreadcontrol,
} from 'zss/gadget/data/types'
import { loadDefaultCharset, loadDefaultPalette } from 'zss/gadget/file/bytes'
import { hub } from 'zss/hub'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'

import Clipping from './clipping'
import { Dither } from './dither'
import { Sprites } from './sprites'
import { Tiles } from './tiles'
import { UserFocus, UserInput, UserInputMods } from './userinput'

const palette = loadDefaultPalette()
const charset = loadDefaultCharset()

interface FramedProps {
  player: string
  layers: LAYER[]
  width: number
  height: number
}

function sendinput(player: string, input: INPUT, mods: UserInputMods) {
  let bits = 0
  if (mods.alt) {
    bits |= INPUT_ALT
  }
  if (mods.ctrl) {
    bits |= INPUT_CTRL
  }
  if (mods.shift) {
    bits |= INPUT_SHIFT
  }
  hub.emit('vm:input', 'gadget', [input, bits], player)
}

export function Framed({ player, layers, width, height }: FramedProps) {
  const control = layersreadcontrol(layers)

  const viewwidth = width * DRAW_CHAR_WIDTH
  const drawwidth = control.width * DRAW_CHAR_WIDTH * control.viewscale
  const marginx = drawwidth - viewwidth

  const viewheight = height * DRAW_CHAR_HEIGHT
  const drawheight = control.height * DRAW_CHAR_HEIGHT * control.viewscale
  const marginy = drawheight - viewheight

  const zone = Math.round(Math.min(viewwidth, viewheight) * 0.3333)

  const offsetx = -control.focusx * DRAW_CHAR_WIDTH * control.viewscale
  const centerx = viewwidth * 0.5 + offsetx

  const offsety = -control.focusy * DRAW_CHAR_HEIGHT * control.viewscale
  const centery = viewheight * 0.5 + offsety

  const left = drawwidth < viewwidth ? (viewwidth - drawwidth) * 0.5 : centerx
  const top =
    drawheight < viewheight ? (viewheight - drawheight) * 0.5 : centery

  const ref = useRef<Group>(null)

  useFrame((state, delta) => {
    const { current } = ref
    if (!current) {
      return
    }

    if (!ispresent(current.userData.focus)) {
      current.position.x = left
      current.position.y = top
      current.userData.focus = new Vector2(left, top)
    }

    const dx = current.position.x - left
    if (Math.abs(dx) >= zone) {
      const step = dx < 0 ? -zone : zone
      current.userData.focus.x = Math.round(left - step)
    }

    const dy = current.position.y - top
    if (Math.abs(dy) >= zone) {
      const step = dy < 0 ? -zone : zone
      current.userData.focus.y = Math.round(top - step * 0.5)
    }

    const slide = 6
    current.position.x +=
      (current.userData.focus.x - current.position.x) * delta * slide
    current.position.y +=
      (current.userData.focus.y - current.position.y) * delta * slide

    current.position.x = clamp(current.position.x, -marginx, 0)
    current.position.y = clamp(current.position.y, -marginy, 0)
  })

  Math.max(-marginy, Math.min(0, centery))

  return (
    <UserFocus>
      <UserInput
        MOVE_LEFT={(mods) => sendinput(player, INPUT.MOVE_LEFT, mods)}
        MOVE_RIGHT={(mods) => sendinput(player, INPUT.MOVE_RIGHT, mods)}
        MOVE_UP={(mods) => sendinput(player, INPUT.MOVE_UP, mods)}
        MOVE_DOWN={(mods) => sendinput(player, INPUT.MOVE_DOWN, mods)}
        OK_BUTTON={(mods) => sendinput(player, INPUT.OK_BUTTON, mods)}
        CANCEL_BUTTON={(mods) => sendinput(player, INPUT.CANCEL_BUTTON, mods)}
        MENU_BUTTON={(mods) => sendinput(player, INPUT.MENU_BUTTON, mods)}
      />
      <Clipping width={viewwidth} height={viewheight}>
        {/* eslint-disable-next-line react/no-unknown-property */}
        <group ref={ref} scale={control.viewscale}>
          {layers.map((layer, i) => {
            switch (layer.type) {
              default:
              case LAYER_TYPE.BLANK:
                return null
              case LAYER_TYPE.TILES:
                return (
                  palette &&
                  charset && (
                    // eslint-disable-next-line react/no-unknown-property
                    <group key={layer.id} position={[0, 0, i]}>
                      <Tiles {...layer} palette={palette} charset={charset} />
                    </group>
                  )
                )
              case LAYER_TYPE.SPRITES:
                return (
                  palette &&
                  charset && (
                    // eslint-disable-next-line react/no-unknown-property
                    <group key={layer.id} position={[0, 0, i]}>
                      <Sprites
                        {...layer}
                        key={layer.id}
                        palette={palette}
                        charset={charset}
                      />
                    </group>
                  )
                )
              case LAYER_TYPE.DITHER:
                return (
                  // eslint-disable-next-line react/no-unknown-property
                  <group key={layer.id} position={[0, 0, i]}>
                    <Dither {...layer} />
                  </group>
                )
            }
          })}
        </group>
      </Clipping>
    </UserFocus>
  )
}
