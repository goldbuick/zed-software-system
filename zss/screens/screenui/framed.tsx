import { useEffect } from 'react'
import {
  registerbookmarkscroll,
  registerterminalopen,
  registerterminalquickopen,
  synthupdate,
  vmclirepeatlast,
  vmfindany,
  vminput,
} from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import {
  INPUT,
  INPUT_ALT,
  INPUT_CTRL,
  INPUT_SHIFT,
  layersreadcontrol,
} from 'zss/gadget/data/types'
import { useGadgetClient, useTape } from 'zss/gadget/data/zustandstores'
import { FlatGraphics } from 'zss/gadget/graphics/flat'
import { FPVGraphics } from 'zss/gadget/graphics/fpv'
import { IsoGraphics } from 'zss/gadget/graphics/iso'
import { MediaLayers } from 'zss/gadget/graphics/medialayer'
import { Mode7Graphics } from 'zss/gadget/graphics/mode7'
import { modsfromevent } from 'zss/gadget/userinput'
import { UserInput } from 'zss/gadget/userinput.bridge'
import { UserInputMods } from 'zss/gadget/userinputtypes'
import { ispid } from 'zss/mapping/guid'
import { ispresent } from 'zss/mapping/types'
import { useGadgetInputBlocked } from 'zss/screens/screenui/gadgetinputblocked'
import { NAME } from 'zss/words/types'

import { ScreenUITickerText } from './tickertext'

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
  // Keyboard shift+arrow is MOVE with shift (UI selection). Game maps that to shoot.
  // Shift is consumed by the remap so inputshift is not left set with an empty inputmove.
  let resolved = input
  if (mods.shift) {
    switch (input) {
      case INPUT.MOVE_LEFT:
        resolved = INPUT.SHOOT_LEFT
        bits &= ~INPUT_SHIFT
        break
      case INPUT.MOVE_RIGHT:
        resolved = INPUT.SHOOT_RIGHT
        bits &= ~INPUT_SHIFT
        break
      case INPUT.MOVE_UP:
        resolved = INPUT.SHOOT_UP
        bits &= ~INPUT_SHIFT
        break
      case INPUT.MOVE_DOWN:
        resolved = INPUT.SHOOT_DOWN
        bits &= ~INPUT_SHIFT
        break
    }
  }
  if (ispid(player)) {
    vminput(SOFTWARE, player, resolved, bits)
  }
}

type ScreenUIFramedProps = {
  width: number
  height: number
}

export function ScreenUIFramed({ width, height }: ScreenUIFramedProps) {
  const player = registerreadplayer()
  const inspector = useTape((state) => state.inspector)
  const inputblocked = useGadgetInputBlocked()

  // handle graphics modes
  const graphics = useGadgetClient((state) => {
    const control = layersreadcontrol(state.gadget.layers ?? [])
    return control.graphics
  })

  // handle synth state switch between boards
  const board = useGadgetClient((state) => state.gadget.board)
  useEffect(() => {
    const { synthstate } = useGadgetClient.getState().gadget
    if (ispresent(synthstate)) {
      synthupdate(SOFTWARE, player, board, synthstate)
    }
  }, [player, board])

  return (
    <>
      {!inputblocked && (
        <UserInput
          MOVE_LEFT={(mods) => sendinput(player, INPUT.MOVE_LEFT, mods)}
          MOVE_RIGHT={(mods) => sendinput(player, INPUT.MOVE_RIGHT, mods)}
          MOVE_UP={(mods) => sendinput(player, INPUT.MOVE_UP, mods)}
          MOVE_DOWN={(mods) => sendinput(player, INPUT.MOVE_DOWN, mods)}
          SHOOT_LEFT={(mods) => sendinput(player, INPUT.SHOOT_LEFT, mods)}
          SHOOT_RIGHT={(mods) => sendinput(player, INPUT.SHOOT_RIGHT, mods)}
          SHOOT_UP={(mods) => sendinput(player, INPUT.SHOOT_UP, mods)}
          SHOOT_DOWN={(mods) => sendinput(player, INPUT.SHOOT_DOWN, mods)}
          OK_BUTTON={(mods) => sendinput(player, INPUT.OK_BUTTON, mods)}
          CANCEL_BUTTON={(mods) => sendinput(player, INPUT.CANCEL_BUTTON, mods)}
          MENU_BUTTON={(mods) => sendinput(player, INPUT.MENU_BUTTON, mods)}
          BUTTON_A={(mods) => sendinput(player, INPUT.BUTTON_A, mods)}
          BUTTON_B={(mods) => sendinput(player, INPUT.BUTTON_B, mods)}
          BUTTON_X={(mods) => sendinput(player, INPUT.BUTTON_X, mods)}
          BUTTON_Y={(mods) => sendinput(player, INPUT.BUTTON_Y, mods)}
          BUTTON_L1={(mods) => sendinput(player, INPUT.BUTTON_L1, mods)}
          BUTTON_L2={(mods) => sendinput(player, INPUT.BUTTON_L2, mods)}
          BUTTON_R1={(mods) => sendinput(player, INPUT.BUTTON_R1, mods)}
          BUTTON_R2={(mods) => sendinput(player, INPUT.BUTTON_R2, mods)}
          keydown={(event) => {
            const key = NAME(event.key)
            const mods = modsfromevent(event)
            const player = registerreadplayer()
            switch (key) {
              case 'c':
                registerterminalquickopen(SOFTWARE, player, '')
                break
              case '@':
                registerterminalopen(SOFTWARE, player, '@')
                break
              case '2':
                if (!mods.ctrl) {
                  registerterminalopen(SOFTWARE, player, '@')
                }
                break
              case '#':
                registerterminalopen(SOFTWARE, player, '#')
                break
              case '3':
                if (!mods.ctrl) {
                  registerterminalopen(SOFTWARE, player, '#')
                }
                break
              case 'p':
                if (mods.ctrl) {
                  vmclirepeatlast(SOFTWARE, player)
                }
                break
              case 'f':
                if (mods.ctrl && inspector) {
                  vmfindany(SOFTWARE, player)
                }
                break
              case 'b':
                if (mods.ctrl) {
                  registerbookmarkscroll(SOFTWARE, player, false)
                }
                break
            }
          }}
        />
      )}
      <MediaLayers />
      {graphics === 'flat' && <FlatGraphics width={width} height={height} />}
      {graphics === 'mode7' && <Mode7Graphics width={width} height={height} />}
      {graphics === 'iso' && <IsoGraphics width={width} height={height} />}
      {graphics === 'fpv' && <FPVGraphics width={width} height={height} />}
      <group position-z={512}>
        <ScreenUITickerText
          width={Math.floor(width)}
          height={Math.floor(height)}
        />
      </group>
    </>
  )
}
