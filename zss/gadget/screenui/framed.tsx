import {
  register_terminal_quickopen,
  vm_clirepeatlast,
  vm_input,
} from 'zss/device/api'
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
import { NAME } from 'zss/words/types'

import { FlatGraphics } from '../graphics/flat'
import { FPVGraphics } from '../graphics/fpv'
import { IsoGraphics } from '../graphics/iso'
import { Mode7Graphics } from '../graphics/mode7'
import { UserInput, UserInputMods, modsfromevent } from '../userinput'

import { TickerText } from './tickertext'

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
  const player = registerreadplayer()

  // re-render only when layer count changes or graphics
  useGadgetClient((state) => state.gadget.layers?.length ?? 0)

  // handle graphics modes
  const graphics = useGadgetClient((state) => {
    const control = layersreadcontrol(state.gadget.layers ?? [])
    return control.graphics
  })

  const tscale = 1.2
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
          const key = NAME(event.key)
          const mods = modsfromevent(event)
          const player = registerreadplayer()
          switch (key) {
            case 'c':
              register_terminal_quickopen(SOFTWARE, player, '')
              break
            case '#':
            case '3':
              register_terminal_quickopen(SOFTWARE, player, '#')
              break
            case 'p':
              if (mods.ctrl) {
                vm_clirepeatlast(SOFTWARE, player)
              }
              break
          }
        }}
      />
      {graphics === 'flat' && <FlatGraphics width={width} height={height} />}
      {graphics === 'mode7' && <Mode7Graphics width={width} height={height} />}
      {graphics === 'iso' && <IsoGraphics width={width} height={height} />}
      {graphics === 'fpv' && <FPVGraphics width={width} height={height} />}
      <group position-z={512} scale={[tscale, tscale, tscale]}>
        <TickerText
          width={Math.floor(width / tscale)}
          height={Math.floor(height / tscale)}
        />
      </group>
    </>
  )
}
