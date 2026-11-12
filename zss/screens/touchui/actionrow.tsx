import {
  registerterminalopen,
  registerterminalquickopen,
  vmclirepeatlast,
} from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { INPUT } from 'zss/gadget/data/types'
import { useTape } from 'zss/gadget/data/zustandstores'
import { inputdown, inputup, triggerhotkey } from 'zss/gadget/userinput'

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
  const editoropen = useTape((state) => state.editor.open)
  const terminalopen = useTape((state) => state.terminal.open)
  if (editoropen) {
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
          letters="cut"
          onToggle={() => {
            triggerhotkey('x', { ctrl: true })
          }}
        />
        <ToggleKey
          x={x + pitch * 2}
          y={y}
          letters="copy"
          onToggle={() => {
            triggerhotkey('c', { ctrl: true })
          }}
        />
        <ToggleKey
          x={x + pitch * 3}
          y={y}
          letters="paste"
          onToggle={() => {
            triggerhotkey('v', { ctrl: true })
          }}
        />
        <ToggleKey
          x={x + pitch * 4}
          y={y}
          letters="$META+z"
          onToggle={() => {
            triggerhotkey('z', { ctrl: true })
          }}
        />
        <ToggleKey
          x={x + pitch * 5}
          y={y}
          letters="$META+p"
          onToggle={() => {
            triggerhotkey('p', { ctrl: true })
          }}
        />
        <ToggleKey
          x={x + pitch * 6}
          y={y}
          letters="enter"
          onToggle={() => {
            inputdown(0, INPUT.OK_BUTTON)
            inputup(0, INPUT.OK_BUTTON)
          }}
        />
      </>
    )
  }
  if (terminalopen) {
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
      </>
    )
  }
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
        letters="$META+p"
        onToggle={() => {
          vmclirepeatlast(SOFTWARE, player)
        }}
      />
      <ToggleKey
        x={x + pitch * 4}
        y={y}
        letters="tab"
        onToggle={() => {
          inputdown(0, INPUT.MENU_BUTTON)
          inputup(0, INPUT.MENU_BUTTON)
        }}
      />
      <ToggleKey
        x={x + pitch * 5}
        y={y}
        letters="enter"
        onToggle={() => {
          inputdown(0, INPUT.OK_BUTTON)
          inputup(0, INPUT.OK_BUTTON)
        }}
      />
    </>
  )
}
