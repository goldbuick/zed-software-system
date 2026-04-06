import {
  registerterminalopen,
  registerterminalquickopen,
  vmclirepeatlast,
} from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { INPUT } from 'zss/gadget/data/types'
import { useDeviceData } from 'zss/gadget/device'
import { inputdown, inputup } from 'zss/gadget/userinput'
import { metakey } from 'zss/words/system'
import { useShallow } from 'zustand/react/shallow'

import { ToggleKey } from './togglekey'

type KeyboardGameProps = {
  height: number
  leftedge: number
  rightedge: number
}

/** Horizontal step between column starts (5-wide key + 2-cell gap). */
const COL_PITCH = 7
const TOP_ROW = 1

type Cell = { x: number; y: number }

function touchkeyboardlayout(
  midstart: number,
  midcols: number,
  rightedge: number,
  height: number,
) {
  const bottom = height - 4
  const yhalf = Math.floor(height * 0.5) - 2
  const col = (i: 0 | 1 | 2) => midstart + i * COL_PITCH

  const navrow = TOP_ROW + 4
  const termrow = navrow + 4

  const modifiers = {
    ctrl: { x: col(0), y: TOP_ROW + 1 } satisfies Cell,
    alt: { x: col(1), y: TOP_ROW } satisfies Cell,
    shift: { x: col(2), y: TOP_ROW + 1 } satisfies Cell,
  }

  const nav = {
    tab: { x: col(0), y: navrow + 1 } satisfies Cell,
    enter: { x: col(1), y: navrow } satisfies Cell,
    esc: { x: col(2), y: navrow + 1 } satisfies Cell,
  }

  const term = {
    q: { x: col(0), y: termrow + 1 } satisfies Cell,
    hash: { x: col(1), y: termrow } satisfies Cell,
    c: { x: col(2), y: termrow + 1 } satisfies Cell,
  }

  const gapbelowterm = 4
  const firstdpady = Math.max(
    Math.max(term.q.y, term.hash.y, term.c.y) + gapbelowterm,
    yhalf,
  )
  const dpadmidy = Math.min(bottom, firstdpady + 4)
  const dpaddowny = Math.min(bottom, dpadmidy + 4)

  const dpadcenterx = midstart + Math.floor(midcols / 2) - 2

  return {
    modifiers,
    nav,
    term,
    repeat: {
      x: midstart + Math.max(0, midcols - 5),
      y: bottom - 1,
    } satisfies Cell,
    dpad: {
      up: { x: dpadcenterx, y: firstdpady } satisfies Cell,
      down: { x: dpadcenterx, y: dpaddowny } satisfies Cell,
      right: { x: rightedge - 4, y: dpadmidy } satisfies Cell,
      left: { x: midstart, y: dpadmidy } satisfies Cell,
    },
  }
}

export function KeyboardGame({
  height,
  leftedge,
  rightedge,
}: KeyboardGameProps) {
  const { keyboardalt, keyboardctrl, keyboardshift } = useDeviceData(
    useShallow((state) => ({
      keyboardalt: state.keyboardalt,
      keyboardctrl: state.keyboardctrl,
      keyboardshift: state.keyboardshift,
    })),
  )

  const midstart = leftedge
  const midcols = rightedge - leftedge + 1
  const L = touchkeyboardlayout(midstart, midcols, rightedge, height)

  const player = registerreadplayer()
  return (
    <>
      <ToggleKey
        x={L.modifiers.ctrl.x}
        y={L.modifiers.ctrl.y}
        letters={keyboardctrl ? metakey.toUpperCase() : metakey.toLowerCase()}
        onToggle={() => {
          if (keyboardctrl) {
            inputup(0, INPUT.CTRL)
          } else {
            inputdown(0, INPUT.CTRL)
          }
          useDeviceData.setState({ keyboardctrl: !keyboardctrl })
        }}
      />
      <ToggleKey
        x={L.modifiers.alt.x}
        y={L.modifiers.alt.y}
        letters={keyboardalt ? 'ALT' : 'alt'}
        onToggle={() => {
          if (keyboardalt) {
            inputup(0, INPUT.ALT)
          } else {
            inputdown(0, INPUT.ALT)
          }
          useDeviceData.setState({ keyboardalt: !keyboardalt })
        }}
      />
      <ToggleKey
        x={L.modifiers.shift.x}
        y={L.modifiers.shift.y}
        letters={keyboardshift ? 'SHIFT' : 'shift'}
        onToggle={() => {
          if (keyboardshift) {
            inputup(0, INPUT.SHIFT)
          } else {
            inputdown(0, INPUT.SHIFT)
          }
          useDeviceData.setState({ keyboardshift: !keyboardshift })
        }}
      />
      <ToggleKey
        x={L.nav.tab.x}
        y={L.nav.tab.y}
        letters="tab"
        onToggle={() => {
          inputdown(0, INPUT.MENU_BUTTON)
          inputup(0, INPUT.MENU_BUTTON)
        }}
      />
      <ToggleKey
        x={L.nav.enter.x}
        y={L.nav.enter.y}
        letters="enter"
        onToggle={() => {
          inputdown(0, INPUT.OK_BUTTON)
          inputup(0, INPUT.OK_BUTTON)
        }}
      />
      <ToggleKey
        x={L.nav.esc.x}
        y={L.nav.esc.y}
        letters="esc"
        onToggle={() => {
          inputdown(0, INPUT.CANCEL_BUTTON)
          inputup(0, INPUT.CANCEL_BUTTON)
        }}
      />
      <ToggleKey
        x={L.term.q.x}
        y={L.term.q.y}
        letters="?"
        onToggle={() => {
          registerterminalopen(SOFTWARE, player)
        }}
      />
      <ToggleKey
        x={L.term.hash.x}
        y={L.term.hash.y}
        letters="#"
        onToggle={() => {
          registerterminalopen(SOFTWARE, player, '#')
        }}
      />
      <ToggleKey
        x={L.term.c.x}
        y={L.term.c.y}
        letters="c"
        onToggle={() => {
          registerterminalquickopen(SOFTWARE, player, '')
        }}
      />
      <ToggleKey
        x={L.repeat.x}
        y={L.repeat.y}
        letters="$meta+p"
        onToggle={() => {
          vmclirepeatlast(SOFTWARE, player)
        }}
      />

      <ToggleKey
        x={L.dpad.up.x}
        y={L.dpad.up.y}
        letters="$24"
        onToggle={() => {
          inputdown(0, INPUT.MOVE_UP)
          inputup(0, INPUT.MOVE_UP)
        }}
      />
      <ToggleKey
        x={L.dpad.down.x}
        y={L.dpad.down.y}
        letters="$25"
        onToggle={() => {
          inputdown(0, INPUT.MOVE_DOWN)
          inputup(0, INPUT.MOVE_DOWN)
        }}
      />
      <ToggleKey
        x={L.dpad.right.x}
        y={L.dpad.right.y}
        letters="$26"
        onToggle={() => {
          inputdown(0, INPUT.MOVE_RIGHT)
          inputup(0, INPUT.MOVE_RIGHT)
        }}
      />
      <ToggleKey
        x={L.dpad.left.x}
        y={L.dpad.left.y}
        letters="$27"
        onToggle={() => {
          inputdown(0, INPUT.MOVE_LEFT)
          inputup(0, INPUT.MOVE_LEFT)
        }}
      />
    </>
  )
}
