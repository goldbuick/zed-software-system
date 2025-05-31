import {
  register_terminal_quickopen,
  vm_clirepeatlast,
  vm_clirepeatslot,
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
import { Mode7Graphics } from '../graphics/mode7'
// TODO: isometric, firstperson, xr/vr/lookingglass
import { modsfromevent, UserInput, UserInputMods } from '../userinput'

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
  useGadgetClient(
    (state) => layersreadcontrol(state.gadget.layers ?? []).graphics,
  )
  const { layers = [] } = useGadgetClient.getState().gadget

  // handle graphics modes
  const control = layersreadcontrol(layers)

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
            case 't':
              register_terminal_quickopen(SOFTWARE, player)
              break
            case 'p':
              if (mods.ctrl) {
                vm_clirepeatlast(SOFTWARE, player)
              }
              break
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
              if (mods.ctrl) {
                vm_clirepeatslot(SOFTWARE, player, parseFloat(key))
              }
              break
          }
        }}
      />
      {control.graphics === 'flat' && (
        <FlatGraphics width={width} height={height} />
      )}
      {control.graphics === 'mode7' && (
        <Mode7Graphics width={width} height={height} />
      )}
    </>
  )
}
