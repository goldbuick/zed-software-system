import { useFrame } from '@react-three/fiber'
import { damp, damp3, sine } from 'maath/easing'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Color, DoubleSide, Group, Vector2 } from 'three'
import { RUNTIME } from 'zss/config'
import { register_terminal_quickopen, vm_input } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { useGadgetClient } from 'zss/gadget/data/state'
import {
  INPUT,
  INPUT_ALT,
  INPUT_CTRL,
  INPUT_SHIFT,
  layersreadcontrol,
} from 'zss/gadget/data/types'
import { ispid } from 'zss/mapping/guid'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import Clipping from './clipping'
import { FramedLayer } from './framedlayer/component'
import { useMedia } from './hooks'
import { TapeTerminalInspector } from './inspector/component'
import { Rect } from './rect'
import { UserInput, UserInputMods } from './userinput'

const focus = new Vector2(0, 0)

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
  if (ispid(player)) {
    vm_input(SOFTWARE, player, input, bits)
  }
}

type FramedProps = {
  width: number
  height: number
}

export function Framed({ width, height }: FramedProps) {
  const { screen } = useMedia()
  const viewwidth = width * RUNTIME.DRAW_CHAR_WIDTH()
  const viewheight = height * RUNTIME.DRAW_CHAR_HEIGHT()

  const focusref = useRef<Group>(null)
  const scaleref = useRef<Group>(null)

  useFrame((_state, delta) => {
    if (!focusref.current || !scaleref.current) {
      return
    }

    // camera focus logic
    const control = layersreadcontrol(
      useGadgetClient.getState().gadget.layers ?? [],
    )

    // smooth viewscale
    const currentviewscale = scaleref.current.scale.x
    // const drawwidth =
    //   control.width * RUNTIME.DRAW_CHAR_WIDTH() * currentviewscale
    // const drawheight =
    //   control.height * RUNTIME.DRAW_CHAR_HEIGHT() * currentviewscale

    // const marginx = drawwidth - viewwidth

    // const marginy = drawheight - viewheight

    // const zone = Math.round(Math.min(viewwidth, viewheight) * 0.3333)

    // const offsetx = -control.focusx * RUNTIME.DRAW_CHAR_WIDTH() * viewscale
    // const centerx = viewwidth * 0.5 + offsetx

    // const offsety = -control.focusy * RUNTIME.DRAW_CHAR_HEIGHT() * viewscale
    // const centery = viewheight * 0.5 + offsety

    // const left = drawwidth < viewwidth ? marginx * -0.5 : centerx
    // const top = drawheight < viewheight ? marginy * -0.5 : centery

    // if (!ispresent(current.userData.focus)) {
    //   current.position.x = left
    //   current.position.y = top
    //   current.userData.focus = focus
    //   current.userData.focus.x = left
    //   current.userData.focus.y = top
    // }

    // smoothed/centered scale
    damp3(scaleref.current.scale, control.viewscale, 0.4, delta)
    if (Math.abs(currentviewscale - control.viewscale) < 0.01) {
      damp3(
        focusref.current.position,
        [
          control.focusx * -RUNTIME.DRAW_CHAR_WIDTH() + viewwidth * 0.5,
          control.focusy * -RUNTIME.DRAW_CHAR_HEIGHT() + viewheight * 0.5,
          0,
        ],
        0.3,
        delta,
      )
    }

    // focus
    // if (marginx < 0) {
    //   current.userData.focus.x = left
    // } else {
    //   const dx = current.position.x - left
    //   if (Math.abs(dx) >= zone) {
    //     const step = dx < 0 ? -zone : zone
    //     current.userData.focus.x = Math.round(left - step)
    //   }
    // }
    // if (marginy < 0) {
    //   current.userData.focus.y = top
    // } else {
    //   const dy = current.position.y - top
    //   if (Math.abs(dy) >= zone) {
    //     const step = dy < 0 ? -zone : zone
    //     current.userData.focus.y = Math.round(top - step * 0.5)
    //   }
    // }

    // // smoooothed
    // const slide = 6
    // current.position.x +=
    //   (current.userData.focus.x - current.position.x) * delta * slide
    // current.position.y +=
    //   (current.userData.focus.y - current.position.y) * delta * slide

    // // clamp to edges
    // if (marginx >= 0) {
    //   current.position.x = clamp(current.position.x, -marginx, 0)
    // }
    // if (marginy >= 0) {
    //   current.position.y = clamp(current.position.y, -marginy, 0)
    // }
  })

  const player = registerreadplayer()

  // re-render only when layer count changes
  useGadgetClient((state) => state.gadget.layers?.length ?? 0)
  const { layers = [] } = useGadgetClient.getState().gadget

  // handle screenshare texture
  const [video, setVideo] = useState<HTMLVideoElement>()
  useEffect(() => {
    const [first] = Object.values(screen)
    if (ispresent(first)) {
      setVideo(first)
    }
  }, [screen])

  // const ratio = 16 / 9
  // const r = useMemo(
  //   () => (video ? video.videoWidth / video.videoHeight : ratio),
  //   [video, ratio],
  // )
  // const mediawidth = 30 * RUNTIME.DRAW_CHAR_WIDTH()

  return (
    <>
      <UserInput
        MOVE_LEFT={(mods) => sendinput(player, INPUT.MOVE_LEFT, mods)}
        MOVE_RIGHT={(mods) => sendinput(player, INPUT.MOVE_RIGHT, mods)}
        MOVE_UP={(mods) => sendinput(player, INPUT.MOVE_UP, mods)}
        MOVE_DOWN={(mods) => sendinput(player, INPUT.MOVE_DOWN, mods)}
        OK_BUTTON={(mods) => sendinput(player, INPUT.OK_BUTTON, mods)}
        CANCEL_BUTTON={(mods) => sendinput(player, INPUT.CANCEL_BUTTON, mods)}
        MENU_BUTTON={(mods) => sendinput(player, INPUT.MENU_BUTTON, mods)}
        keydown={(event) => {
          const { key } = event
          const lkey = NAME(key)
          switch (lkey) {
            case 't':
              register_terminal_quickopen(SOFTWARE, registerreadplayer())
              break
          }
        }}
      />
      {layers.length > 0 && (
        <Rect
          visible
          color={new Color(0.076, 0.076, 0)}
          width={width}
          height={height}
          z={-2}
        />
      )}
      <Clipping width={viewwidth} height={viewheight}>
        <group ref={focusref}>
          <group ref={scaleref}>
            <TapeTerminalInspector />
            {layers.map((layer, i) => (
              <FramedLayer key={layer.id} id={layer.id} z={i * 2} />
            ))}
            {/* {video && (
            <group
              position={[
                29.5 * RUNTIME.DRAW_CHAR_WIDTH(),
                12.5 * RUNTIME.DRAW_CHAR_HEIGHT(),
                layers.length * 2 + 1,
              ]}
            >
              <mesh>
                <planeGeometry args={[mediawidth, mediawidth / r]} />
                <meshBasicMaterial side={DoubleSide}>
                  <videoTexture attach="map" args={[video]} />
                </meshBasicMaterial>
              </mesh>
            </group>
          )} */}
          </group>
        </group>
      </Clipping>
    </>
  )
}
