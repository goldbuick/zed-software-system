import { Vector2 } from 'three'
import { deepcopy } from 'zss/mapping/types'
import { tokenizeandwritetextformat } from 'zss/words/textformat'
import { COLOR, PT } from 'zss/words/types'

import { resetTiles, useDeviceConfig, useWriteText, writeTile } from '../hooks'

import { NumKey } from './numkey'
import { ThumbStick } from './thumbstick'
import { ToggleKey } from './togglekey'
import { TouchPlane } from './touchplane'
import { WordPlane } from './wordplane'

type ElementsProps = {
  width: number
  height: number
  onReset: () => void
}

const motion = new Vector2()
const DECO = 177
const FG = COLOR.WHITE
const BG = COLOR.DKPURPLE
const LIST_LEFT = 8

export function Elements({ width, height, onReset }: ElementsProps) {
  const left = width - 19
  const mid = width - 13
  const right = width - 7
  const context = useWriteText()
  const { keyboardshift, keyboardctrl, keyboardalt, wordlist } =
    useDeviceConfig()

  resetTiles(context, DECO, FG, BG)

  const leftedge = Math.round(width * 0.333)
  const rightedge = Math.round(width * 0.666)
  for (let y = 0; y < rightedge; ++y) {
    for (let x = leftedge; x <= right; ++x) {
      writeTile(context, width, height, x, y, { char: 176 })
    }
  }

  const corner: PT = { x: LIST_LEFT, y: 0 }
  return (
    <>
      <TouchPlane
        x={0}
        y={-3}
        width={width}
        height={3}
        onPointerDown={() => {
          // toggle sidebar
          useDeviceConfig.setState((state) => ({
            ...state,
            sidebaropen: !state.sidebaropen,
          }))
        }}
      />
      {keyboardctrl ? (
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
        </>
      ) : (
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

          {keyboardalt ? (
            <>
              <NumKey x={left} y={12} letters="=" digit="#" />
            </>
          ) : (
            <>
              <NumKey x={left} y={12} letters="@" digit="#" />
            </>
          )}
          <NumKey x={mid} y={13} letters="" digit="0" />
          <NumKey x={right} y={12} letters="ENTER" digit="[Enter]" />
        </>
      )}
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
          {keyboardalt ? (
            <>
              <NumKey x={1} y={0} letters="^" digit="," />
              <NumKey x={7} y={1} letters="&" digit="." />
              <NumKey x={13} y={0} letters="{" digit="[" />
              <NumKey x={19} y={1} letters="}" digit="]" />
            </>
          ) : (
            <>
              <NumKey x={1} y={0} letters="-" digit="+" />
              <NumKey x={7} y={1} letters="%" digit="*" />
              <NumKey x={13} y={0} letters="<" digit="(" />
              <NumKey x={19} y={1} letters=">" digit=")" />
            </>
          )}

          <NumKey x={1} y={4} letters="ESC" digit="[Escape]" />
          <ToggleKey
            x={7}
            y={5}
            letters={keyboardctrl ? 'CTRL' : 'ctrl'}
            onToggle={() => {
              useDeviceConfig.setState((state) => ({
                ...state,
                keyboardctrl: !state.keyboardctrl,
              }))
            }}
          />
          <ToggleKey
            x={13}
            y={4}
            letters={keyboardalt ? 'ALT' : 'alt'}
            onToggle={() => {
              useDeviceConfig.setState((state) => ({
                ...state,
                keyboardalt: !state.keyboardalt,
              }))
            }}
          />
          <NumKey x={19} y={5} letters="$26" digit="[ArrowRight]" usealt />

          <NumKey x={1} y={8} letters="SPACE" digit="[Space]" />
          <ToggleKey
            x={7}
            y={9}
            letters={keyboardshift ? 'SHIFT' : 'shift'}
            onToggle={() => {
              useDeviceConfig.setState((state) => ({
                ...state,
                keyboardshift: !state.keyboardshift,
              }))
            }}
          />
          <NumKey x={13} y={8} letters="BKSPC" digit="[Backspace]" />
          <NumKey x={19} y={9} letters="$27" digit="[ArrowLeft]" usealt />

          {keyboardalt ? (
            <>
              <NumKey x={1} y={12} letters="<" digit=">" />
              <NumKey x={7} y={13} letters=";" digit="!" />
              <NumKey x={13} y={12} letters="\" digit="|" />
              <NumKey x={19} y={13} letters="" digit="x" />
            </>
          ) : (
            <>
              <NumKey x={1} y={12} letters="/" digit="?" />
              <NumKey x={7} y={13} letters=";" digit="!" />
              <NumKey x={13} y={12} letters=":" digit="'" />
              <NumKey x={19} y={13} letters={`"`} digit="$" />
            </>
          )}
        </>
      )}
      <ThumbStick
        width={width}
        height={height}
        onUp={onReset}
        onDrawStick={(startx, starty, tipx, tipy) => {
          for (let i = 0; i < 5; ++i) {
            context.x = startx - 3
            context.y = starty - 2 + i
            tokenizeandwritetextformat(
              `$dkblue$177$177$177$177$177$177$177`,
              context,
              false,
            )
          }
          // limit knob range
          motion.x = tipx - startx
          motion.y = tipy - starty
          motion.normalize().multiplyScalar(4)
          for (let i = 0; i < 3; ++i) {
            context.x = startx + Math.round(motion.x) - 1
            context.y = starty + Math.round(motion.y) - 1 + i
            tokenizeandwritetextformat(`$blue$219$219$219`, context, false)
          }
        }}
      />
    </>
  )
}
