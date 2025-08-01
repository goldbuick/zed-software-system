import { deepcopy } from 'zss/mapping/types'
import { PT } from 'zss/words/types'

import { useDeviceData } from '../hooks'

import { LIST_LEFT } from './common'
import { NumKey } from './numkey'
import { ToggleKey } from './togglekey'
import { WordPlane } from './wordplane'

type KeyboardDevProps = {
  width: number
}

export function KeyboardDev({ width }: KeyboardDevProps) {
  const { keyboardshift, wordlist } = useDeviceData()
  const left = width - 18
  const mid = width - 12
  const right = width - 6
  const corner: PT = { x: LIST_LEFT, y: 0 }
  return (
    <>
      <NumKey x={left} y={0} letters="" digit="1" />
      <NumKey x={mid} y={1} letters="ABC" digit="2" />
      <NumKey x={right} y={0} letters="DEF" digit="3" />

      <NumKey x={left} y={4} letters="GHI" digit="4" />
      <NumKey x={mid} y={5} letters="JKL" digit="5" />
      <NumKey x={right} y={4} letters="MNO" digit="6" />

      <NumKey x={left} y={8} letters="PQRS" digit="7" />
      <NumKey x={mid} y={9} letters="TUV" digit="8" />
      <NumKey x={right} y={8} letters="WXYZ" digit="9" />

      <NumKey x={left} y={12} letters="@" digit="#" />
      <NumKey x={mid} y={13} letters="" digit="0" />
      <NumKey x={right} y={12} letters="ENTER" digit="[Enter]" />

      {wordlist.length ? (
        <>
          <NumKey x={1} y={0} letters="$27" digit="[ArrowLeft]" usealt />
          <NumKey x={1} y={4} letters="BKSPC" digit="[Backspace]" />
          <NumKey x={1} y={8} letters="SPACE" digit="[Space]" />
          <NumKey x={1} y={12} letters="$26" digit="[ArrowRight]" usealt />
          {wordlist.map((word) => {
            const at = deepcopy(corner)
            const wordwidth = word.length + 3
            corner.x += wordwidth
            if (corner.x > left - 4) {
              corner.x = LIST_LEFT
              corner.y += 3
            }
            return <WordPlane key={word} x={at.x} y={at.y} letters={word} />
          })}
        </>
      ) : (
        <>
          <NumKey x={1} y={0} letters="-" digit="+" />
          <NumKey x={7} y={1} letters="%" digit="*" />
          <NumKey x={13} y={0} letters="<" digit="(" />
          <NumKey x={19} y={1} letters=">" digit=")" />

          <NumKey x={1} y={4} letters="ESC" digit="[Escape]" />
          <ToggleKey
            x={7}
            y={5}
            letters="ctrl"
            onToggle={() =>
              useDeviceData.setState({
                keyboardctrl: true,
              })
            }
          />
          <ToggleKey
            x={13}
            y={4}
            letters="alt"
            onToggle={() =>
              useDeviceData.setState({
                keyboardalt: true,
              })
            }
          />
          <NumKey x={19} y={5} letters="$27" digit="[ArrowLeft]" usealt />

          <NumKey x={1} y={8} letters="SPACE" digit="[Space]" />
          <ToggleKey
            x={7}
            y={9}
            letters={keyboardshift ? 'SHIFT' : 'shift'}
            onToggle={() => {
              useDeviceData.setState((state) => ({
                keyboardshift: !state.keyboardshift,
              }))
            }}
          />
          <NumKey x={13} y={8} letters="BKSPC" digit="[Backspace]" />
          <NumKey x={19} y={9} letters="$26" digit="[ArrowRight]" usealt />

          <NumKey x={1} y={12} letters="/" digit="?" />
          <NumKey x={7} y={13} letters=";" digit="!" />
          <NumKey x={13} y={12} letters=":" digit="'" />
          <NumKey x={19} y={13} letters={`"`} digit="$" />
        </>
      )}
    </>
  )
}
