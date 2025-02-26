import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Color, Group, Vector2 } from 'three'
import { RUNTIME } from 'zss/config'
import { tape_terminal_quickopen, vm_input } from 'zss/device/api'
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
    vm_input(SOFTWARE, input, bits, player)
  }
}

type FramedProps = {
  width: number
  height: number
}

export function Framed({ width, height }: FramedProps) {
  const viewwidth = width * RUNTIME.DRAW_CHAR_WIDTH()
  const viewheight = height * RUNTIME.DRAW_CHAR_HEIGHT()

  const ref = useRef<Group>(null)

  useFrame((_state, delta) => {
    const { current } = ref
    if (!current) {
      return
    }

    // camera focus logic
    const control = layersreadcontrol(
      useGadgetClient.getState().gadget.layers ?? [],
    )

    const drawwidth =
      control.width * RUNTIME.DRAW_CHAR_WIDTH() * control.viewscale
    const marginx = drawwidth - viewwidth

    const drawheight =
      control.height * RUNTIME.DRAW_CHAR_HEIGHT() * control.viewscale
    const marginy = drawheight - viewheight

    const zone = Math.round(Math.min(viewwidth, viewheight) * 0.3333)

    const offsetx =
      -control.focusx * RUNTIME.DRAW_CHAR_WIDTH() * control.viewscale
    const centerx = viewwidth * 0.5 + offsetx

    const offsety =
      -control.focusy * RUNTIME.DRAW_CHAR_HEIGHT() * control.viewscale
    const centery = viewheight * 0.5 + offsety

    const left = drawwidth < viewwidth ? marginx * -0.5 : centerx
    const top = drawheight < viewheight ? marginy * -0.5 : centery

    // setup
    if (!ispresent(current.userData.focus)) {
      current.position.x = left
      current.position.y = top
      current.userData.focus = focus
      current.userData.focus.x = left
      current.userData.focus.y = top
    }

    // scale
    current.scale.setScalar(control.viewscale)

    // focus
    if (marginx < 0) {
      current.userData.focus.x = left
    } else {
      const dx = current.position.x - left
      if (Math.abs(dx) >= zone) {
        const step = dx < 0 ? -zone : zone
        current.userData.focus.x = Math.round(left - step)
      }
    }
    if (marginy < 0) {
      current.userData.focus.y = top
    } else {
      const dy = current.position.y - top
      if (Math.abs(dy) >= zone) {
        const step = dy < 0 ? -zone : zone
        current.userData.focus.y = Math.round(top - step * 0.5)
      }
    }

    // smoooothed
    const slide = 6
    current.position.x +=
      (current.userData.focus.x - current.position.x) * delta * slide
    current.position.y +=
      (current.userData.focus.y - current.position.y) * delta * slide

    // clamp to edges
    if (marginx >= 0) {
      current.position.x = clamp(current.position.x, -marginx, 0)
    }
    if (marginy >= 0) {
      current.position.y = clamp(current.position.y, -marginy, 0)
    }
  })

  const player = registerreadplayer()

  // re-render only when layer count changes
  useGadgetClient((state) => state.gadget.layers?.length ?? 0)
  const { layers = [] } = useGadgetClient.getState().gadget

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
              tape_terminal_quickopen(SOFTWARE, registerreadplayer())
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
        <group ref={ref}>
          <TapeTerminalInspector />
          {layers.map((layer, i) => (
            <FramedLayer key={layer.id} id={layer.id} z={i * 2} />
          ))}
        </group>
      </Clipping>
    </>
  )
}
