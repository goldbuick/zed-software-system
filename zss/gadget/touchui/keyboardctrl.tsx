import { deepcopy } from 'zss/mapping/types'
import { PT } from 'zss/words/types'

import { useDeviceConfig } from '../hooks'

import { LIST_LEFT } from './common'
import { NumKey } from './numkey'
import { ToggleKey } from './togglekey'
import { WordPlane } from './wordplane'

type KeyboardCtrlProps = {
  width: number
}

export function KeyboardCtrl({ width }: KeyboardCtrlProps) {
  const { keyboardshift, wordlist } = useDeviceConfig()
  const left = width - 19
  const mid = width - 13
  const right = width - 7
  const corner: PT = { x: LIST_LEFT, y: 0 }
  return (
    <>
      <NumKey x={right} y={0} letters="CTRL" digit="k" usectrl />

      <NumKey x={left} y={4} letters="CTRL" digit="r" usectrl />
      <NumKey x={mid} y={5} letters="CTRL" digit="s" usectrl />
      <NumKey x={right} y={4} letters="CTRL" digit="x" usectrl />

      <NumKey x={left} y={8} letters="CTRL" digit="p" usectrl />
      <NumKey x={mid} y={9} letters="CTRL" digit="a" usectrl />
      <NumKey x={right} y={8} letters="CTRL" digit="c" usectrl />

      <NumKey x={left} y={12} letters="CTRL" digit="y" usectrl />
      <NumKey x={mid} y={13} letters="CTRL" digit="z" usectrl />
      <NumKey x={right} y={12} letters="CTRL" digit="v" usectrl />
      {wordlist.length ? (
        <>
          <NumKey x={1} y={0} letters="$26" digit="[ArrowRight]" usealt />
          <NumKey x={1} y={4} letters="BKSPC" digit="[Backspace]" />
          <NumKey x={1} y={8} letters="SPACE" digit="[Space]" />
          <NumKey x={1} y={12} letters="$27" digit="[ArrowLeft]" usealt />
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
              useDeviceConfig.setState({
                keyboardctrl: false,
              })
            }
          />
          <ToggleKey
            x={13}
            y={4}
            letters="alt"
            onToggle={() =>
              useDeviceConfig.setState({
                keyboardctrl: false,
                keyboardalt: true,
              })
            }
          />
          <NumKey x={19} y={5} letters="$26" digit="[ArrowRight]" usealt />

          <NumKey x={1} y={8} letters="SPACE" digit="[Space]" />
          <ToggleKey
            x={7}
            y={9}
            letters={keyboardshift ? 'SHIFT' : 'shift'}
            onToggle={() => {
              useDeviceConfig.setState((state) => ({
                keyboardshift: !state.keyboardshift,
              }))
            }}
          />
          <NumKey x={13} y={8} letters="BKSPC" digit="[Backspace]" />
          <NumKey x={19} y={9} letters="$27" digit="[ArrowLeft]" usealt />

          <NumKey x={1} y={12} letters="/" digit="?" />
          <NumKey x={7} y={13} letters=";" digit="!" />
          <NumKey x={13} y={12} letters=":" digit="'" />
          <NumKey x={19} y={13} letters={`"`} digit="$" />
        </>
      )}
    </>
  )
}
