import { useFrame } from '@react-three/fiber'
import { damp3 } from 'maath/easing'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Color, DoubleSide, Group } from 'three'
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
import { ispresent } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import Clipping from './clipping'
import { FramedLayer } from './framedlayer/component'
import { useMedia } from './hooks'
import { TapeTerminalInspector } from './inspector/component'
import { Rect } from './rect'
import { UserInput, UserInputMods } from './userinput'

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

  const centerref = useRef<Group>(null)
  const focusref = useRef<Group>(null)
  const scaleref = useRef<Group>(null)

  useFrame((_state, delta) => {
    if (!centerref.current || !focusref.current || !scaleref.current) {
      return
    }

    // camera focus logic
    const control = layersreadcontrol(
      useGadgetClient.getState().gadget.layers ?? [],
    )

    // setup tracking state
    if (!ispresent(focusref.current.userData.focus)) {
      focusref.current.userData.focus = {
        x: control.focusx,
        y: control.focusy,
      }
      scaleref.current.scale.setScalar(control.viewscale)
    }

    // smooth viewscale
    const currentviewscale = scaleref.current.scale.x
    const drawwidth = RUNTIME.DRAW_CHAR_WIDTH() * currentviewscale
    const drawheight = RUNTIME.DRAW_CHAR_HEIGHT() * currentviewscale
    const cols = viewwidth / drawwidth
    const rows = viewheight / drawheight
    const left = Math.round(cols * 0.5)
    const top = Math.round(rows * 0.5)
    const right = control.width - cols * 0.5
    const bottom = control.height - rows * 0.5
    const marginx =
      cols > control.width ? -Math.round((cols - control.width) * 0.5) : 0
    const marginy =
      rows > control.height ? -Math.round((rows - control.height) * 0.5) : 0

    // smoothed/centered scale
    centerref.current.position.x = viewwidth * 0.5
    centerref.current.position.y = viewheight * 0.5
    damp3(scaleref.current.scale, control.viewscale, 0.3, delta)

    // smoothed focus
    const fx = focusref.current.userData.focus.x + marginx
    const fy = focusref.current.userData.focus.y + marginy
    const tx = fx * -RUNTIME.DRAW_CHAR_WIDTH()
    const ty = fy * -RUNTIME.DRAW_CHAR_HEIGHT()
    damp3(focusref.current.position, [tx, ty, 0], 0.3, delta)

    if (currentviewscale > 1.5) {
      // near is always centered
      focusref.current.userData.focus.x = control.focusx
      focusref.current.userData.focus.y = control.focusy
    } else {
      // mid pans
      const zone = Math.round(Math.min(cols, rows) * 0.333)
      const dx = Math.round(focusref.current.userData.focus.x - control.focusx)
      const dy = Math.round(focusref.current.userData.focus.y - control.focusy)

      if (Math.abs(dx) >= zone) {
        const step = dx < 0 ? zone : -zone
        focusref.current.userData.focus.x += step
      }

      if (Math.abs(dy) >= zone) {
        const step = dy < 0 ? zone : -zone
        focusref.current.userData.focus.y += step
      }
    }

    // edge clamp
    if (marginx === 0) {
      if (focusref.current.userData.focus.x < left) {
        focusref.current.userData.focus.x = left
      }
      if (focusref.current.userData.focus.x > right) {
        focusref.current.userData.focus.x = right
      }
    } else {
      focusref.current.userData.focus.x = left
    }
    if (marginy === 0) {
      if (focusref.current.userData.focus.y < top) {
        focusref.current.userData.focus.y = top
      }
      if (focusref.current.userData.focus.y > bottom) {
        focusref.current.userData.focus.y = bottom
      }
    } else {
      focusref.current.userData.focus.y = top
    }
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

  const ratio = 16 / 9
  const r = useMemo(
    () => (video ? video.videoWidth / video.videoHeight : ratio),
    [video, ratio],
  )
  const mediawidth = 30 * RUNTIME.DRAW_CHAR_WIDTH()

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
        <group ref={centerref}>
          <group ref={scaleref}>
            <group ref={focusref}>
              <TapeTerminalInspector />
              {layers.map((layer, i) => (
                <FramedLayer key={layer.id} id={layer.id} z={i * 2} />
              ))}
              {video && (
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
              )}
            </group>
          </group>
        </group>
      </Clipping>
    </>
  )
}
