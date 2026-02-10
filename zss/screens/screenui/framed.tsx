/* eslint-disable react/no-unknown-property */
import { useEffect, useMemo } from 'react'
import {
  registerterminalopen,
  registerterminalquickopen,
  synthupdate,
  vmclirepeatlast,
  vmfindany,
  vminput,
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
import { FlatGraphics } from 'zss/gadget/graphics/flat'
import { FPVGraphics } from 'zss/gadget/graphics/fpv'
import { IsoGraphics } from 'zss/gadget/graphics/iso'
import { MediaLayers } from 'zss/gadget/graphics/medialayer'
import { Mode7Graphics } from 'zss/gadget/graphics/mode7'
import { UserInput, UserInputMods, modsfromevent } from 'zss/gadget/userinput'
import { ispid } from 'zss/mapping/guid'
import { deepcopy, ispresent } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'
import { useShallow } from 'zustand/react/shallow'

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
  if (ispid(player)) {
    vminput(SOFTWARE, player, input, bits)
  }
}

type ScreenUIFramedProps = {
  width: number
  height: number
}

export function ScreenUIFramed({ width, height }: ScreenUIFramedProps) {
  const player = registerreadplayer()

  // re-render only when layer count, board render id, or graphics changes
  useGadgetClient(
    useShallow((state) => [
      state.gadget.id,
      state.gadget.board,
      state.gadget.layers?.length ?? 0,
    ]),
  )

  // handle graphics modes
  const graphics = useGadgetClient((state) => {
    const control = layersreadcontrol(state.gadget.layers ?? [])
    return control.graphics
  })

  const { board, synthstate } = useGadgetClient.getState().gadget
  useEffect(() => {
    if (ispresent(synthstate)) {
      synthupdate(SOFTWARE, player, board, synthstate)
    }
  }, [player, board, synthstate])

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
              registerterminalquickopen(SOFTWARE, player, '')
              break
            case '@':
            case '2':
              registerterminalopen(SOFTWARE, player, '@')
              break
            case '#':
            case '3':
              registerterminalopen(SOFTWARE, player, '#')
              break
            case 'p':
              if (mods.ctrl) {
                vmclirepeatlast(SOFTWARE, player)
              }
              break
            case 'a':
              if (mods.ctrl) {
                vmfindany(SOFTWARE, player)
              }
              break
          }
        }}
      />
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
