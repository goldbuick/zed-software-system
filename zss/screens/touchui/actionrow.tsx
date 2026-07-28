import { registerterminalopen, registerterminalquickopen } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { INPUT } from 'zss/gadget/data/types'
import { inputdown, inputup } from 'zss/gadget/userinput'

import { ToggleKey } from './togglekey'

type ActionRowProps = {
  /** Left char column of first key. */
  x: number
  y: number
  /** Pitch between key left edges (default 5-wide key + 1 gap). */
  pitch?: number
}

export function ActionRow({ x, y, pitch = 6 }: ActionRowProps) {
  const player = registerreadplayer()
  return (
    <>
      <ToggleKey
        x={x}
        y={y}
        letters="esc"
        onToggle={() => {
          inputdown(0, INPUT.CANCEL_BUTTON)
          inputup(0, INPUT.CANCEL_BUTTON)
        }}
      />
      <ToggleKey
        x={x + pitch}
        y={y}
        letters="?"
        onToggle={() => {
          registerterminalopen(SOFTWARE, player)
        }}
      />
      <ToggleKey
        x={x + pitch * 2}
        y={y}
        letters="c"
        onToggle={() => {
          registerterminalquickopen(SOFTWARE, player, '')
        }}
      />
      <ToggleKey
        x={x + pitch * 3}
        y={y}
        letters="tab"
        onToggle={() => {
          inputdown(0, INPUT.MENU_BUTTON)
          inputup(0, INPUT.MENU_BUTTON)
        }}
      />
    </>
  )
}
