import { deepcopy } from 'zss/mapping/types'
import { PT } from 'zss/words/types'

import { useDeviceData } from '../hooks'

import { LIST_LEFT } from './common'
import { NumKey } from './numkey'
import { ToggleKey } from './togglekey'
import { WordPlane } from './wordplane'

type KeyboardCtrlProps = {
  width: number
}

export function KeyboardCtrl({ width }: KeyboardCtrlProps) {
  const { keyboardshift, wordlist } = useDeviceData()
  const left = width - 18
  const mid = width - 12
  const right = width - 6
  const corner: PT = { x: LIST_LEFT, y: 0 }
  return (
    <>
      <NumKey x={right} y={0} letters="" digit="k" usectrl />

      <NumKey x={left} y={4} letters="" digit="r" usectrl />
      <NumKey x={mid} y={5} letters="" digit="s" usectrl />
      <NumKey x={right} y={4} letters="" digit="x" usectrl />

      <NumKey x={left} y={8} letters="" digit="p" usectrl />
      <NumKey x={mid} y={9} letters="" digit="a" usectrl />
      <NumKey x={right} y={8} letters="" digit="c" usectrl />

      <NumKey x={left} y={12} letters="" digit="y" usectrl />
      <NumKey x={mid} y={13} letters="" digit="z" usectrl />
      <NumKey x={right} y={12} letters="" digit="v" usectrl />
      {wordlist.length ? (
        <>
          <NumKey x={1} y={0} letters="$24" digit="[ArrowUp]" usealt />
          <NumKey x={1} y={4} letters="BKSPC" digit="[Backspace]" />
          <NumKey x={1} y={8} letters="SPACE" digit="[Space]" />
          <NumKey x={1} y={12} letters="$25" digit="[ArrowDown]" usealt />
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
            letters="CTRL"
            onToggle={() =>
              useDeviceData.setState({
                keyboardctrl: false,
              })
            }
          />
          <ToggleKey
            x={13}
            y={4}
            letters="alt"
            onToggle={() =>
              useDeviceData.setState({
                keyboardctrl: false,
                keyboardalt: true,
              })
            }
          />
          <NumKey x={19} y={5} letters="$24" digit="[ArrowUp]" usectrl />

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
          <NumKey x={19} y={9} letters="$25" digit="[ArrowDown]" usectrl />

          <NumKey x={1} y={12} letters="/" digit="?" />
          <NumKey x={7} y={13} letters=";" digit="!" />
          <NumKey x={13} y={12} letters=":" digit="'" />
          <NumKey x={19} y={13} letters={`"`} digit="$" />
        </>
      )}
    </>
  )
}
