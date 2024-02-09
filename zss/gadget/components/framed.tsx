import React from 'react'
import { hub } from 'zss/hub'

import {
  DRAW_CHAR_HEIGHT,
  DRAW_CHAR_WIDTH,
  INPUT,
  LAYER,
  LAYER_TYPE,
  layersreadcontrol,
} from '../data/types'
import { loadDefaultCharset, loadDefaultPalette } from '../file/bytes'

import Clipping from './clipping'
import { Dither } from './dither'
import { Sprites } from './sprites'
import { Tiles } from './tiles'
import { UserFocus, UserInput } from './userinput'

const palette = loadDefaultPalette()
const charset = loadDefaultCharset()

interface FramedProps {
  player: string
  layers: LAYER[]
  width: number
  height: number
}

function sendinput(player: string, input: INPUT) {
  hub.emit('vm:input', 'gadget', input, player)
}

export function Framed({ player, layers, width, height }: FramedProps) {
  const control = layersreadcontrol(layers)

  const viewwidth = width * DRAW_CHAR_WIDTH
  const drawwidth = control.width * DRAW_CHAR_WIDTH * control.viewscale
  const marginx = drawwidth - viewwidth

  const viewheight = height * DRAW_CHAR_HEIGHT
  const drawheight = control.height * DRAW_CHAR_HEIGHT * control.viewscale
  const marginy = drawheight - viewheight

  const offsetx = -control.focusx * DRAW_CHAR_WIDTH * control.viewscale
  const centerx = viewwidth * 0.5 + offsetx

  const offsety = -control.focusy * DRAW_CHAR_HEIGHT * control.viewscale
  const centery = viewheight * 0.5 + offsety

  const left =
    drawwidth < viewwidth
      ? (viewwidth - drawwidth) * 0.5
      : Math.max(-marginx, Math.min(0, centerx))

  const top =
    drawheight < viewheight
      ? (viewheight - drawheight) * 0.5
      : Math.max(-marginy, Math.min(0, centery))

  return (
    <UserFocus>
      <UserInput
        MOVE_LEFT={() => sendinput(player, INPUT.MOVE_LEFT)}
        MOVE_RIGHT={() => sendinput(player, INPUT.MOVE_RIGHT)}
        MOVE_UP={() => sendinput(player, INPUT.MOVE_UP)}
        MOVE_DOWN={() => sendinput(player, INPUT.MOVE_DOWN)}
        SHOOT_LEFT={() => sendinput(player, INPUT.SHOOT_LEFT)}
        SHOOT_RIGHT={() => sendinput(player, INPUT.SHOOT_RIGHT)}
        SHOOT_UP={() => sendinput(player, INPUT.SHOOT_UP)}
        SHOOT_DOWN={() => sendinput(player, INPUT.SHOOT_DOWN)}
        OK_BUTTON={() => sendinput(player, INPUT.OK_BUTTON)}
        CANCEL_BUTTON={() => sendinput(player, INPUT.CANCEL_BUTTON)}
        MENU_BUTTON={() => sendinput(player, INPUT.MENU_BUTTON)}
      />
      <Clipping width={viewwidth} height={viewheight}>
        {/* eslint-disable-next-line react/no-unknown-property */}
        <group scale={control.viewscale} position={[left, top, 0]}>
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
